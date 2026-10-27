import { useState } from "react";
import { ChatApp } from "./components/ChatApp";
import { LoginScreen } from "./components/LoginScreen";
import { RegisterScreen } from "./components/RegisterScreen";
import { clearToken, getToken } from "./lib/auth";

const REGISTERED_NOTICE = "Akun sudah dibuat. Silakan masuk.";

type Screen =
  | { name: "login"; arrived: boolean; identifier?: string; notice?: string }
  | { name: "register" };

const App = () => {
  const [token, setTokenState] = useState(getToken);
  const [screen, setScreen] = useState<Screen>({
    name: "login",
    arrived: false,
  });

  const onLoggedIn = () => {
    setTokenState(getToken());
    setScreen({ name: "login", arrived: false });
  };

  if (!token) {
    return screen.name === "register" ? (
      <RegisterScreen
        onLoggedIn={onLoggedIn}
        onLoginNeeded={(email) =>
          setScreen({
            name: "login",
            arrived: true,
            identifier: email,
            notice: REGISTERED_NOTICE,
          })
        }
        onSwitch={() => setScreen({ name: "login", arrived: true })}
      />
    ) : (
      <LoginScreen
        onLoggedIn={onLoggedIn}
        onSwitch={() => setScreen({ name: "register" })}
        initialIdentifier={screen.identifier}
        notice={screen.notice}
        autoFocus={screen.arrived}
      />
    );
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
