from fastapi import FastAPI, HTTPException, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, HttpUrl
from typing import Optional, Union
import requests
from bs4 import BeautifulSoup
from openai import OpenAI
import os
from dotenv import load_dotenv
import uvicorn
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging
import time
import re

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(
    title="AI Fact Checker",
    description="AI-powered fact checking with reputable source verification",
    version="1.0.0"
)

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Thread pool for blocking operations
executor = ThreadPoolExecutor(max_workers=4)

# Pydantic models
class FactCheckRequest(BaseModel):
    input_type: str  # "url" or "claim"
    content: str
    
class FactCheckResponse(BaseModel):
    claim: str
    verdict: str
    reasoning: str
    sources: list[str]
    confidence: str
    processing_time: Optional[float] = None

class SearchRequest(BaseModel):
    query: str

# Core fact-checking functions (from your original code)
def fetch_content(url: str) -> str:
    """Fetch and extract content from a URL"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        html_content = response.text
        
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Remove script and style elements
        for script_or_style in soup(['script', 'style']):
            script_or_style.decompose()
        
        text_content = soup.get_text()
        # Clean up text
        lines = (line.strip() for line in text_content.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text_content = ' '.join(chunk for chunk in chunks if chunk)
        
        return text_content
    except Exception as e:
        logger.error(f"Error fetching content from {url}: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch content: {str(e)}")

def summarize_content(text_content: str) -> str:
    """Summarize content using OpenAI"""
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that creates concise, factual summaries."},
                {"role": "user", "content": f"Summarize the key claims in this article:\n\n{text_content[:4000]}"}
            ],
            max_tokens=300,
            temperature=0.1
        )
        summary = response.choices[0].message.content
        return summary
    except Exception as e:
        logger.error(f"Error summarizing content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to summarize content: {str(e)}")

def perform_web_search(query: str) -> dict:
    """Perform web search using OpenAI's Responses API with reputable sources"""
    try:
        logger.info(f"Starting web search for query: {query}")
        
        response = client.responses.create(
            model="gpt-4o",
            tools=[{
                "type": "web_search",
                "filters": {
                    "allowed_domains": [
                        "reuters.com", "apnews.com", "bbc.com", "cnn.com",
                        "npr.org", "wsj.com", "nytimes.com", "washingtonpost.com",
                        "theguardian.com", "abcnews.go.com", "cbsnews.com",
                        "foxnews.com", "usatoday.com", "bloomberg.com", "politico.com"
                    ]
                }
            }],
            tool_choice={"type": "web_search"},
            input=f"Find recent factual information from reputable news sources about: {query}"
        )
        
        # Extract the main summary text
        search_results_text = response.output_text
        logger.info(f"Got search results text: {search_results_text[:200]}...")
        
        # Extract source URLs from the response - corrected approach
        source_urls = []
        
        # Method 1: Check if web_search results are available in the response
        if hasattr(response, 'tool_calls') and response.tool_calls:
            logger.info(f"Found {len(response.tool_calls)} tool calls")
            for tool_call in response.tool_calls:
                if (hasattr(tool_call, 'output') and 
                    hasattr(tool_call.output, 'web_search') and 
                    hasattr(tool_call.output.web_search, 'results')):
                    
                    for result in tool_call.output.web_search.results:
                        if hasattr(result, 'url'):
                            source_urls.append(result.url)
                            logger.info(f"Added source from tool_call: {result.url}")
        
        # Method 2: If no sources found via tool_calls, parse them from the text
        if not source_urls:
            logger.info("Attempting to parse sources from response text")
            # Extract URLs from the text using simple pattern matching
            url_pattern = r'https?://[^\s\)]+'
            potential_urls = re.findall(url_pattern, search_results_text)
            
            # Filter for reputable news domains
            news_domains = [
                "reuters.com", "apnews.com", "bbc.com", "cnn.com", "npr.org",
                "wsj.com", "nytimes.com", "washingtonpost.com", "theguardian.com",
                "abcnews.go.com", "cbsnews.com", "foxnews.com", "usatoday.com",
                "bloomberg.com", "politico.com"
            ]
            
            for url in potential_urls:
                if any(domain in url for domain in news_domains):
                    source_urls.append(url)
                    logger.info(f"Added source from text parsing: {url}")
        
        # Method 3: Fallback - extract all URLs that look like news sources
        if not source_urls:
            all_urls = re.findall(url_pattern, search_results_text)
            source_urls = [url for url in all_urls if any(ext in url for ext in ['.com', '.org', '.news'])]
            logger.info(f"Added {len(source_urls)} fallback sources from text")
        
        # Remove duplicates while preserving order
        seen = set()
        source_urls = [url for url in source_urls if not (url in seen or seen.add(url))]
        
        logger.info(f"Total unique sources found: {len(source_urls)}")
        if source_urls:
            logger.info(f"Sample source: {source_urls[0]}")
        
        return {
            "text": search_results_text,
            "sources": source_urls
        }
        
    except Exception as e:
        logger.error(f"Error in web search: {str(e)}")
        # Enhanced fallback with better error handling
        try:
            logger.info("Attempting fallback to chat completions API")
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a fact-checking assistant. Provide factual information based on your knowledge of reputable news sources. When mentioning information, include the specific source URLs if known."
                    },
                    {
                        "role": "user", 
                        "content": f"Provide factual information about: {query}. Include specific source URLs from reputable news sources when possible."
                    }
                ],
                max_tokens=800,
                temperature=0.1
            )
            
            # Parse URLs from the fallback response
            fallback_text = response.choices[0].message.content
            url_pattern = r'https?://[^\s\)]+'
            fallback_sources = re.findall(url_pattern, fallback_text)
            
            return {
                "text": fallback_text,
                "sources": fallback_sources
            }
        except Exception as fallback_error:
            logger.error(f"Fallback also failed: {str(fallback_error)}")
            return {"text": f"Search unavailable. Error: {str(e)}", "sources": []}

def assign_verdict(search_data: dict, original_claim: str) -> dict:
    """Use LLM to analyze search results against the original claim"""
    search_text = search_data["text"]
    source_urls = search_data["sources"]
    
    logger.info(f"Search text: {search_text}")
    
    # Enhanced prompt with explicit source citation requirement
    analysis_prompt = f"""
    Analyze the following search results from reputable news sources and determine the accuracy of the claim.
    
    ORIGINAL CLAIM: {original_claim}
    
    SEARCH RESULTS: {search_text}
    
    AVAILABLE SOURCE URLs:
    {chr(10).join([f"{i+1}. {url}" for i, url in enumerate(source_urls)]) if source_urls else "No specific sources provided"}
    
    Based on the evidence from reputable sources, provide your verdict as one of these three options:
    - "True": The claim is substantiated by multiple reliable sources
    - "False": The claim is contradicted by reliable sources  
    - "Speculative": Insufficient or conflicting evidence from reliable sources
    
    Provide a brief reasoning explaining your verdict. 
    
    Format your response exactly as: 
    VERDICT: [True/False/Speculative] 
    REASONING: [your explanation in markdown format]
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a factual accuracy analyst. Be objective and evidence-based."},
                {"role": "user", "content": analysis_prompt}
            ],
            temperature=0.0,
        )
        
        result = response.choices[0].message.content
        
        # Parse the result to extract verdict and reasoning
        verdict = "Speculative"
        reasoning = "Unable to determine accuracy"
        
        if " | REASONING:" in result:
            parts = result.split(" | REASONING:")
            if len(parts) == 2:
                verdict_part = parts[0].replace("VERDICT:", "").strip()
                reasoning = parts[1].strip()
                verdict = verdict_part
        else:
            # Fallback parsing
            lines = result.split('\n')
            for line in lines:
                if line.startswith('VERDICT:'):
                    verdict = line.replace('VERDICT:', '').strip()
                elif line.startswith('REASONING:'):
                    reasoning = line.replace('REASONING:', '').strip()
        
        # Determine confidence based on verdict and sources
        confidence = "Low"
        if source_urls and len(source_urls) > 0:
            if verdict.lower() in ["true", "false"]:
                confidence = "High" if len(source_urls) >= 2 else "Medium"
            else:
                confidence = "Medium"
        
        return {
            "verdict": verdict,
            "confidence": confidence,
            "reasoning": reasoning,
            "sources": source_urls
        }
        
    except Exception as e:
        logger.error(f"Error in verdict analysis: {str(e)}")
        return {
            "verdict": "Speculative",
            "confidence": "Low",
            "reasoning": "Insufficient or conflicting evidence from reliable sources",
            "sources": source_urls
        }

async def fact_check_async(input_type: str, content: str) -> dict:
    """Asynchronous fact-checking function"""
    loop = asyncio.get_event_loop()
    
    try:
        if input_type == "url":
            # Fetch content from URL
            text_content = await loop.run_in_executor(executor, fetch_content, content)
            claim = await loop.run_in_executor(executor, summarize_content, text_content)
        else:
            claim = content
        
        # Perform web search
        search_data = await loop.run_in_executor(executor, perform_web_search, claim)
        
        # Assign verdict
        verdict_data = await loop.run_in_executor(executor, assign_verdict, search_data, claim)
        
        return {
            "claim": claim,
            "verdict": verdict_data["verdict"],
            "confidence": verdict_data["confidence"],
            "reasoning": verdict_data["reasoning"],
            "sources": verdict_data["sources"]
        }
        
    except Exception as e:
        logger.error(f"Error in fact checking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Routes
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Serve the main page"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/fact-check", response_model=FactCheckResponse)
async def fact_check_endpoint(request: FactCheckRequest):
    """Main fact-checking endpoint"""
    start_time = time.time()
    
    try:
        result = await fact_check_async(request.input_type, request.content)
        processing_time = time.time() - start_time
        
        return FactCheckResponse(
            claim=result["claim"],
            verdict=result["verdict"],
            reasoning=result["reasoning"],
            sources=result["sources"],
            confidence=result["confidence"],
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Fact-check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
async def search_endpoint(request: SearchRequest):
    """Search for information about a topic using the same web search as fact-checking"""
    try:
        search_data = await asyncio.get_event_loop().run_in_executor(
            executor, perform_web_search, request.query
        )
        
        return {
            "query": request.query,
            "results": search_data["text"],
            "sources": search_data["sources"]
        }
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "AI Fact Checker"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )