from agent import build_graph
import dotenv
dotenv.load_dotenv()

print("Running test agent call on AAPL...")
agent = build_graph()
result = agent.invoke({
    "ticker": "AAPL", 
    "messages": [], 
    "technical_analysis": "", 
    "sentiment_analysis": "", 
    "recommendation": "", 
    "info": {}
})

print("\n--- TEST SUCCESS ---")
print("Ticker:", result.get("ticker"))
print("Company Name:", result.get("info", {}).get("name"))
print("Technical Summary:\n", result.get("technical_analysis"))
print("Sentiment Summary:\n", result.get("sentiment_analysis"))
print("\nFinal PM Recommendation:\n", result.get("recommendation"))
