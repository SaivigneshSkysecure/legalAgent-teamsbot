# Legal Agent API

This API provides an interface to interact with the Azure AI Legal Agent through a FastAPI application.

## Setup

1. Ensure you have Python 3.8+ installed
2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Make sure your `.env` file is properly configured with the following variables:
   ```
   AZURE_AI_AGENT_MODEL_DEPLOYMENT_NAME="gpt-4o"
   AZURE_AI_AGENT_PROJECT_CONNECTION_STRING="your-connection-string"
   AZURE_TestUserAgent_ID="your-agent-id"
   ```

## Running the API

Start the FastAPI server:

```
python api.py
```

The API will be available at `http://localhost:8000`.

## API Endpoints

### POST /query

Send a query to the legal agent.

**Request Body:**

```json
{
  "query": "Your legal question here",
  "additional_details": {
    "key1": "value1",
    "key2": "value2"
  }
}
```

The `additional_details` field is optional and can contain any relevant information that might help the agent provide a better response.

**Response:**

```json
{
  "response": "The agent's response to your query"
}
```

## API Documentation

Once the server is running, you can access the auto-generated API documentation at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
