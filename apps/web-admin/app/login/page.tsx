"use client";

import { useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { PivotAvatar } from "@/components/ui";
import { Icon } from "@iconify/react";
import { Loader2, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession();
      if (session) {
        router.push("/");
      }
    };
    checkAuth();
  }, [router]);

  // Handle NextAuth errors
  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "AccessDenied") {
      setError("הכניסה נדחתה. האימייל או שם המשתמש לא מורשים במערכת.");
    }
  }, [searchParams]);


  // Unified authentication handler
  const handleAuthentication = async (provider: string, credentials?: any) => {
    setError("");
    
    try {
      console.log(`🔐 Starting authentication with provider: ${provider}`);
      
      const result = await signIn(provider, {
        ...credentials,
        redirect: false,
      });
      
      if (result?.error) {
        switch (result.error) {
          case "CredentialsSignin":
            setError("שם המשתמש לא מורשה במערכת.");
            break;
          case "AccessDenied":
            setError("הכניסה נדחתה. פרטי ההתחברות לא מורשים במערכת.");
            break;
          default:
            setError(`שגיאה בהתחברות: ${result.error}`);
        }
        return;
      }

      if (result?.ok) {
        console.log("✅ Authentication successful");
        
        // Wait a bit for session to be created
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const session = await getSession();
        
        if (session) {
          router.push("/");
        } else {
          console.log("⚠️ No session found after successful authentication");
          // Try to get session again
          setTimeout(async () => {
            const retrySession = await getSession();
            if (retrySession) {
              router.push("/");
            }
          }, 2000);
        }
      } else {
        console.log("⚠️ Authentication result was not ok:", result);
      }
    } catch (error) {
      console.error("💥 Authentication error:", error);
      setError("שגיאה בהתחברות. נסה שוב.");
    }
  };

  // Handle username form submission
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    await handleAuthentication("username", { username: username.trim() });
    setIsLoading(false);
  };

  // Handle Google OAuth
  const handleGoogleSignIn = async () => {
    setError("");
    setIsGoogleLoading(true);
    await handleAuthentication("google"); // Use the unified handler
    setIsGoogleLoading(false);
  };

  return (
    <div className=" flex items-center justify-center p-4 max-sm:p-0">
      {/* Background Elements */}
      <div className="absolute max-sm:hidden top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-green-400/20 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-lg !shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl relative z-10">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <CardHeader className="max-sm:p-4 text-center space-y-6 pb-8">
          {/* Logo */}
          <div className="flex justify-center">
            <PivotAvatar float rotate className="!w-12 !h-12 max-sm:!w-8 max-sm:!h-8" style={{ display: 'block' }} />
          </div>
          
          {/* Title */}
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              פיבוט
            </CardTitle>
            <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
               מערכת ניהול מסעדות ומלאי
            </CardDescription>
          </div>

          {/* Greeting */}
          {/* <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg p-4 border border-blue-200/50 dark:border-blue-700/50">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              ברוכים הבאים למערכת ניהול המסעדות המתקדמת שלנו. 
              <br />
              התחברו כדי לגשת לפאנל הניהול
            </p>
          </div> */}
        </CardHeader>

        <CardContent className="max-sm:p-4 space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Username Form */}
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <div className="mb-2">
              <Label htmlFor="username" className="text-sm max-sm:hidden font-medium">
                שם משתמש
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="הכנס שם משתמש"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading || isGoogleLoading}
                className="text-center text-lg py-3 h-12"
                dir="ltr"
              />
            </div>
            <Button
              type="submit"
              className="h-12 w-full btn-primary font-semibold"
              // disabled={!username.trim() || isLoading || isGoogleLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  מתחבר...
                </>
              ) : (
                "כניסה"
              )}
            </Button>
          </form>

          {/* Separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs cursor-default uppercase">
              <span className="bg-background/10 backdrop-blur-xl px-2 text-muted-foreground">או</span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="default"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
            className="w-full h-12 rounded-lg  bg-black text-white dark:bg-white dark:text-black text-base border-[0.8px] border-gray-200 hover:border-gray-300 py-3 transition-all duration-200 hover:shadow-md active:scale-100 active:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                מתחבר...
              </>
            ) : (
              <>
                <Icon icon="logos:google-icon" className="mr-2 h-5 w-5" />
                כניסה עם Google
              </>
            )}
          </Button>

          {/* Footer Info */}
          <div className="text-center pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              רק משתמשים מורשים יכולים לגשת למערכת
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
