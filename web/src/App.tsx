import { useState } from "react";
import { ChatApp } from "./components/ChatApp";
import { LoginScreen } from "./components/LoginScreen";
import { clearToken, getToken } from "./lib/auth";

const App = () => {
  const [token, setTokenState] = useState(getToken);

  if (!token) {
    return <LoginScreen onLoggedIn={() => setTokenState(getToken())} />;
  }

  return (
    <ChatApp
      onLogout={() => {
        clearToken();
        setTokenState(null);
      }}
    />
  );
};

export default App;
