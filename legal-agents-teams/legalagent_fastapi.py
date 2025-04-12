from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
import asyncio
import uvicorn
from azure.identity.aio import DefaultAzureCredential
from semantic_kernel.agents.azure_ai import AzureAIAgent, AzureAIAgentSettings
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Retrieve Azure Speech Service credentials from environment variables
MODEL_DEPLOYMENT_NAME = os.getenv("AZURE_AI_AGENT_MODEL_DEPLOYMENT_NAME")
PROJECT_CONNECTION_STRING = os.getenv("AZURE_AI_AGENT_PROJECT_CONNECTION_STRING")
AGENT_ID = os.getenv("AZURE_TestUserAgent_ID")

app = FastAPI(title="Legal Agent API", description="API for interacting with Azure AI Legal Agent")

class QueryRequest(BaseModel):
    query: str
    additional_details: dict = {}

class QueryResponse(BaseModel):
    response: str

@app.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest = Body(...)):
    try:
        # Use asynchronous context managers to authenticate and create the client
        ai_agent_settings = AzureAIAgentSettings(
            model_deployment_name=MODEL_DEPLOYMENT_NAME,
            project_connection_string=PROJECT_CONNECTION_STRING
        )

        async with (
            DefaultAzureCredential() as creds,
            AzureAIAgent.create_client(credential=creds, settings=ai_agent_settings) as client,
        ):
            # 1. Retrieve the agent definition based on the assistant ID
            agent_definition = await client.agents.get_agent(
                agent_id=AGENT_ID,
            )

            # 2. Create a Semantic Kernel agent using the retrieved definition
            agent = AzureAIAgent(client=client, definition=agent_definition)

            # 3. Create a new conversation thread
            thread = await client.agents.create_thread()

            try:
                # 4. Add the user query as a chat message
                user_query = request.query
                
                # If there are additional details, format them and add to the query
                if request.additional_details:
                    details_str = "\n".join([f"{key}: {value}" for key, value in request.additional_details.items()])
                    user_query = f"{user_query}\n\nAdditional details:\n{details_str}"
                
                await agent.add_chat_message(thread_id=thread.id, message=user_query)
                
                # 5. Retrieve the agent's response
                response = await agent.get_response(thread_id=thread.id)
                
                # Extract the text content from the response object
                # The error shows the response is a ChatMessageContent object with items containing TextContent
                response_text = ""
                if hasattr(response, 'items'):
                    for item in response.items:
                        if hasattr(item, 'text'):
                            response_text += item.text
                elif hasattr(response, 'text'):
                    response_text = response.text
                elif isinstance(response, str):
                    response_text = response
                else:
                    # Fallback: convert the entire object to string
                    response_text = str(response)
                
                return {"response": response_text}
            finally:
                # 6. Cleanup: Delete the conversation thread
                await client.agents.delete_thread(thread.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("legalagent_fastapi:app", host="0.0.0.0", port=8000, reload=True)
