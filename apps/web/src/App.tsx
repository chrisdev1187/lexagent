import { AuthProvider } from "./lib/auth";
import { AuthGate } from "./components/AuthGate";
// @ts-ignore — LexAgent is a plain JS file
import LexAgent from "./components/LexAgent";

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <LexAgent />
      </AuthGate>
    </AuthProvider>
  );
}
