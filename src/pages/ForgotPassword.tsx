import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Globe, Mail, ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Step = "email" | "otp" | "done";

const ForgotPassword = () => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Missing email", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
      toast({ title: "Code sent!", description: `A verification code has been sent to ${email}.` });
    }, 1500);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast({ title: "Incomplete code", description: "Please enter the full 6-digit code.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("done");
      toast({ title: "Verified!", description: "Your identity has been confirmed." });
    }, 1500);
  };

  const stepVariants = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-16">
      {/* background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
          animate={{ scale: [1, 1.15, 1], x: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl"
          animate={{ scale: [1, 1.2, 1], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="glass rounded-3xl p-8 sm:p-10">
          {/* logo */}
          <Link to="/" className="mb-6 flex items-center justify-center gap-2">
            <Globe size={28} className="text-primary" />
            <span className="font-display text-2xl font-bold">Voxinity</span>
          </Link>

          {/* progress indicator */}
          <div className="mb-8 flex items-center justify-center gap-2">
            {(["email", "otp", "done"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <motion.div
                  className={`h-2.5 rounded-full transition-colors ${
                    step === s
                      ? "bg-primary w-8"
                      : (["email", "otp", "done"].indexOf(step) > i
                          ? "bg-primary/40 w-2.5"
                          : "bg-muted-foreground/20 w-2.5")
                  }`}
                  layout
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Email */}
            {step === "email" && (
              <motion.div
                key="email"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Mail size={24} className="text-primary" />
                  </div>
                  <h1 className="text-xl font-bold">Forgot your password?</h1>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Enter your email and we'll send you a verification code.
                  </p>
                </div>

                <form onSubmit={handleSendCode} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email" className="text-xs font-medium text-muted-foreground">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        className="rounded-xl py-5 pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full gap-2 rounded-xl py-5" disabled={loading}>
                    {loading ? (
                      <motion.div
                        className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <>
                        Send Verification Code
                        <ArrowRight size={16} />
                      </>
                    )}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* Step 2: OTP */}
            {step === "otp" && (
              <motion.div
                key="otp"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <ShieldCheck size={24} className="text-primary" />
                  </div>
                  <h1 className="text-xl font-bold">Enter verification code</h1>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyCode} className="space-y-6">
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={0} className="h-12 w-12 rounded-xl border border-input text-lg" />
                        <InputOTPSlot index={1} className="h-12 w-12 rounded-xl border border-input text-lg" />
                        <InputOTPSlot index={2} className="h-12 w-12 rounded-xl border border-input text-lg" />
                      </InputOTPGroup>
                      <div className="mx-3" />
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={3} className="h-12 w-12 rounded-xl border border-input text-lg" />
                        <InputOTPSlot index={4} className="h-12 w-12 rounded-xl border border-input text-lg" />
                        <InputOTPSlot index={5} className="h-12 w-12 rounded-xl border border-input text-lg" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <Button type="submit" className="w-full gap-2 rounded-xl py-5" disabled={loading}>
                    {loading ? (
                      <motion.div
                        className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <>
                        Verify Code
                        <ArrowRight size={16} />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Didn't receive a code?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        toast({ title: "Code resent!", description: `A new code has been sent to ${email}.` });
                      }}
                      className="font-medium text-primary hover:underline"
                    >
                      Resend
                    </button>
                  </p>
                </form>
              </motion.div>
            )}

            {/* Step 3: Done */}
            {step === "done" && (
              <motion.div
                key="done"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6 text-center">
                  <motion.div
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                  >
                    <CheckCircle2 size={24} className="text-primary" />
                  </motion.div>
                  <h1 className="text-xl font-bold">You're all set!</h1>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Your identity has been verified. You can now return to login and reset your password.
                  </p>
                </div>

                <Button
                  className="w-full gap-2 rounded-xl py-5"
                  onClick={() => navigate("/login")}
                >
                  Back to Sign In
                  <ArrowRight size={16} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* back to login link (shown on email & otp steps) */}
          {step !== "done" && (
            <p className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft size={14} />
                Back to Sign In
              </Link>
            </p>
          )}
        </div>
      </motion.div>
    </main>
  );
};

export default ForgotPassword;
