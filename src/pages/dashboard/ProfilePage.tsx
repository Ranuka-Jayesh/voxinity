import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, MapPin, Mail, Calendar, Globe, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ProfilePage = () => {
  const { toast } = useToast();
  const [name, setName] = useState("John Doe");
  const [email] = useState("john@example.com");
  const [location, setLocation] = useState("San Francisco, CA");
  const [bio, setBio] = useState("Product designer & polyglot. I love breaking language barriers with technology.");

  const handleSave = () => {
    toast({ title: "Profile updated", description: "Your changes have been saved." });
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal information</p>
      </motion.div>

      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="group relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 text-4xl font-bold text-primary">
              JD
            </div>
            <button className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100">
              <Camera size={14} />
            </button>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-foreground">{name}</h2>
            <p className="text-sm text-muted-foreground">Pro Plan · Premium Member</p>
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground sm:justify-start">
              <span className="flex items-center gap-1"><Mail size={12} />{email}</span>
              <span className="flex items-center gap-1"><MapPin size={12} />{location}</span>
              <span className="flex items-center gap-1"><Calendar size={12} />Joined Jan 2024</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Edit form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <h3 className="mb-5 text-sm font-semibold text-foreground">Edit Profile</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Full Name</Label>
            <Input className="rounded-xl" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input className="rounded-xl" value={email} disabled />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Location</Label>
            <Input className="rounded-xl" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Preferred Language</Label>
            <Input className="rounded-xl" defaultValue="English" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Bio</Label>
            <textarea
              className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-none"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button className="rounded-xl" onClick={handleSave}>Save Changes</Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="grid gap-4 sm:grid-cols-3"
      >
        {[
          { icon: Globe, label: "Languages", value: "7", sub: "Active languages" },
          { icon: Shield, label: "Plan", value: "Pro", sub: "Next billing: Feb 28" },
          { icon: Calendar, label: "Member Since", value: "Jan 2024", sub: "14 months active" },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon size={20} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default ProfilePage;
