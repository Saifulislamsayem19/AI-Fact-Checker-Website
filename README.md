# AI Fact Checker Website 🔍

This project is a fact-checking platform that analyzes news articles and user-submitted claims using AI and deterministic checks against a curated list of reputable sources. It returns a short verdict, supporting evidence (citations), and a confidence score to help users quickly assess reliability.

<img width="1514" height="940" alt="image" src="https://github.com/user-attachments/assets/416426e8-26aa-4037-beeb-a37c1a05a599" />


## 🌟 Features

* **AI-Powered Fact Checking**: Advanced AI analysis of news articles and claims using GPT-4
* **Multiple Input Methods**: Support for URL analysis and direct claim checking
* **Reputable Source Verification**: Only uses trusted news sources (BBC, Reuters, AP News, CNN, NPR, etc.)
* **Fake News Detection**: Flags untrustworthy content and questionable sources
* **Advanced Search**: Search for specific claims and events with source verification
* **User-Friendly Interface**: Clean, intuitive design with real-time results
* **Confidence Scoring**: Each analysis includes confidence levels (High/Medium/Low)
* **Source Citations**: All results include references to original sources
* **Share Functionality**: Easy sharing of fact-check results
* **Async Processing**: Non-blocking operations for better performance

## 🛠️ Technology Stack

* **Backend**: FastAPI (Python) - High-performance async web framework
* **Frontend**: HTML5, CSS3, JavaScript (ES6+) - Modern web technologies
* **AI/NLP**: OpenAI GPT-4 - Advanced language model for analysis
* **Web Scraping**: BeautifulSoup4, Requests - Content extraction and processing
* **Styling**: Custom CSS with modern design principles
* **Deployment**: Uvicorn ASGI server

## 📁 Project Structure

```
fact-checker/
├── main.py                 # FastAPI backend application
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── README.md              # This file
├── templates/
│   └── index.html         # Main HTML template
└── static/
    ├── styles.css         # CSS styling
    └── script.js          # JavaScript functionality
```

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- OpenAI API key
- Internet connection (for web scraping and API calls)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-fact-checker.git
   cd ai-fact-checker
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

5. **Run the application**
   ```bash
   python main.py
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:8000`


## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here
```

### Trusted News Sources

The application uses a curated list of reputable news sources:

- Reuters (reuters.com)
- Associated Press (apnews.com)
- BBC (bbc.com)
- CNN (cnn.com)
- NPR (npr.org)
- Wall Street Journal (wsj.com)
- New York Times (nytimes.com)
- Washington Post (washingtonpost.com)
- The Guardian (theguardian.com)
- ABC News (abcnews.go.com)
- CBS News (cbsnews.com)
- Fox News (foxnews.com)
- USA Today (usatoday.com)
- Bloomberg (bloomberg.com)
- Politico (politico.com)

## 🔌 API Endpoints

### Main Endpoints

- **GET /** - Serve the main web interface
- **POST /fact-check** - Analyze a claim or URL
- **POST /search** - Search for information on a topic
- **GET /health** - Health check endpoint

### API Usage Examples

#### Fact-Check a Claim
```bash
curl -X POST "http://localhost:8000/fact-check" \
     -H "Content-Type: application/json" \
     -d '{
       "input_type": "claim",
       "content": "The Earth is flat"
     }'
```

#### Fact-Check a URL
```bash
curl -X POST "http://localhost:8000/fact-check" \
     -H "Content-Type: application/json" \
     -d '{
       "input_type": "url",
       "content": "https://example-news-site.com/article"
     }'
```

#### Search for Information
```bash
curl -X POST "http://localhost:8000/search" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "climate change latest research"
     }'
```

### Response Format

```json
{
  "claim": "The analyzed claim",
  "verdict": "True|False|Speculative",
  "reasoning": "Detailed analysis explanation",
  "sources": ["https://source1.com", "https://source2.com"],
  "confidence": "High|Medium|Low",
  "processing_time": 2.34
}
```

## 🏗️ Architecture

The application follows a modern async architecture:

1. **FastAPI Backend**: Handles HTTP requests and responses
2. **Async Processing**: Non-blocking operations for better performance
3. **Thread Pool**: Manages CPU-intensive tasks (web scraping, AI calls)
4. **Content Extraction**: BeautifulSoup for clean text extraction
5. **AI Analysis**: OpenAI GPT-4 for intelligent fact-checking
6. **Source Verification**: Restricted to reputable news domains

## 🧪 Testing

Run the application in development mode:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Test the health endpoint:
```bash
curl http://localhost:8000/health
```

## 🚀 Deployment

### Production Setup

1. **Install production dependencies**
   ```bash
   pip install gunicorn
   ```

2. **Run with Gunicorn**
   ```bash
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 style guidelines
- Add type hints to all functions
- Include docstrings for complex functions
- Write tests for new features
- Update documentation as needed

## 🐛 Troubleshooting

### Common Issues

**OpenAI API Errors**
- Ensure your API key is valid and has sufficient credits
- Check rate limits if you're getting 429 errors

**Web Scraping Failures**
- Some sites may block requests; this is expected behavior
- The application gracefully handles failed requests

**Performance Issues**
- Increase `MAX_WORKERS` environment variable for more concurrent processing
- Consider caching mechanisms for frequently checked claims

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for providing the GPT-4 API
- FastAPI team for the excellent web framework
- BeautifulSoup team for web scraping capabilities
- All reputable news organizations for providing reliable information

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/ai-fact-checker/issues) page
2. Create a new issue with detailed information
3. Contact the maintainers

---

**⚠️ Disclaimer**: This tool is designed to assist with fact-checking but should not be the sole source for verifying information. Always cross-reference with multiple sources and use critical thinking when evaluating claims.

**Built with ❤️ for fighting misinformation**
