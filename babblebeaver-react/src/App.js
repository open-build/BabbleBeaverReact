import React, {useState, useEffect} from "react"
import './style.css';

export default function App() {

  const [suggestedPrompts, setSuggestedPrompts] = useState([])
  const [isDisabled, setIsDisabled] = useState(false) // for the input field and the button
  const [query, setQuery] = useState("")

  useEffect(() => {
    // get rid of conversation history and tokens used on page refresh
    sessionStorage.removeItem("messageHistory"); 
    sessionStorage.removeItem("totalUsedTokens");

    fetch("http://127.0.0.1:8000/pre_user_prompt", {
      method: "GET",
    })
      .then((response) => response.json())
      .then((data) => setSuggestedPrompts(data))
  }, [])

  const submitForm = async (e) => {
    e.preventDefault()

    if (query.trim() === '') return;
    setSuggestedPrompts([]);

    const chatMessages = document.getElementById("chat-messages")

    // updating conversation container with user's query
    const queryMessageContainer = document.createElement('div');
    queryMessageContainer.className = "message user-message"

    const messageQueryText = document.createElement('p');
    messageQueryText.textContent = query

    queryMessageContainer.append(messageQueryText);
    chatMessages.append(queryMessageContainer);

    // let's add the load dot animation to signal thinking....
    const loader = document.createElement("div")
    loader.id = "loader"
    loader.className = "loader"
    chatMessages.append(loader)

    setQuery("")
    setIsDisabled(true)

    let sessionMessageHistory = sessionStorage.getItem("messageHistory");
    let userMessages = sessionMessageHistory ? JSON.parse(sessionMessageHistory)["user"] : [];
    let botMessages = sessionMessageHistory ? JSON.parse(sessionMessageHistory)["bot"] : [];
    let localMessageHistory = {user: userMessages, bot: botMessages}

    let sessionNumTokens = sessionStorage.getItem("totalUsedTokens");
    let localNumTokens = sessionNumTokens ? JSON.parse(sessionNumTokens) : 0;

    await fetch("http://127.0.0.1:8000/chatbot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: query,
        history: localMessageHistory,
        tokens: localNumTokens
      })
    })
      .then((response) => response.json())
      .then((data) => {
        const {response: botMessage, usedTokens, updatedHistory} = data;
        
        // update client side with number of used tokens(included tokens used for the last user query and bot response)
        sessionStorage.setItem("totalUsedTokens", JSON.stringify(usedTokens));
        
        // if chat history was truncated because of token limit exceeded, needs to be updated on client side as well
        if (updatedHistory) {
          localMessageHistory = updatedHistory;
          sessionStorage.setItem("messageHistory", JSON.stringify(localMessageHistory));
        }
        
        // update chat history
        localMessageHistory["user"].push(query);
        localMessageHistory["bot"].push(botMessage);
        sessionStorage.setItem("messageHistory", JSON.stringify(localMessageHistory));
        
        // updating conversation container with bot's response
        const botMessageContainer = document.createElement('div');
        botMessageContainer.className = "message bot-message"

        const messageBotText = document.createElement('p')
        messageBotText.textContent = botMessage;

        botMessageContainer.append(messageBotText);
        chatMessages.append(botMessageContainer);

        chatMessages.scrollTop = chatMessages.scrollHeight;

        setIsDisabled(false)
        const loaderElem = document.getElementById("loader")
        if (loaderElem) {
          chatMessages.removeChild(loaderElem)
        }
      })
      .catch((e) => console.log(`Error: ${e}`))
  }

  return (
    <>
      <div className="container">
        <div className="chat-container">
            <h1 className="text-center">BabbleBeaver React</h1>
            
            <div id = "suggested-prompts" onClick = {(e) => setQuery(e.target.textContent)}>
              {suggestedPrompts.map((suggestedPrompt, index) => {
                return (
                  <button className = "suggested-prompt-btn" key = {index}>{suggestedPrompt}</button>
                )
              })}
            </div>
            <div id="chat-messages"></div>
            
            <form id="chat-form" className="mt-4" onSubmit = {(e) => submitForm(e)}>
                <div className="form-group">
                    <input type="text" id="user-input" className="form-control" value = {query} placeholder="Type your message..." onChange = {(e) => setQuery(e.target.value)} disabled = {isDisabled}/>
                </div>
                <button id="submit-input" type="submit" className="btn btn-primary btn-block" disabled = {isDisabled}>Send</button>
            </form>
        </div>
    </div>
    </>
  )
} 