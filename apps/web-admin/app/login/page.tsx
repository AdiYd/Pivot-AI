"use client";

import { useState } from "react";
import { useFirebase } from "@/lib/firebaseClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { sendSignInLink, signInWithLink, user } = useFirebase();
  const router = useRouter();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSending(true);
    try {
      await sendSignInLink(email);
      setIsSent(true);
    } catch (error) {
      console.error("Error sending sign in link", error);
    } finally {
      setIsSending(false);
    }
  };
  
  // Attempt to sign in with the email link if available
  async function attemptSignIn() {
    const savedEmail = window.localStorage.getItem("emailForSignIn");
    if (savedEmail) {
      try {
        const user = await signInWithLink(savedEmail);
        if (user) {
          router.push("/");
        }
      } catch (error) {
        console.error("Error signing in with link", error);
      }
    }
  }
  
  // Check for email link on component mount
  useState(() => {
    attemptSignIn();
  });
  
  // If user is already logged in, redirect to dashboard
  if (user) {
    router.push("/");
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">WhatsApp Inventory Bot</CardTitle>
          <CardDescription className="text-center">
            Admin Panel Login
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSent ? (
            <div className="space-y-4 text-center">
              <p>Magic link sent!</p>
              <p className="text-sm text-muted-foreground">
                Check your email for a link to sign in.
              </p>
              <p className="text-sm text-muted-foreground">
                You can close this window if you&apos;ve opened the link in another tab.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSending}
              >
                {isSending ? "Sending..." : "Send Magic Link"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center text-xs text-muted-foreground">
          <p>You&apos;ll receive a magic link via email to sign in</p>
        </CardFooter>
      </Card>
    </div>
  );
}
