import { motion } from "framer-motion";
import { Camera, MapPin, Mail, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const ProfileCard = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    className="rounded-2xl border border-border bg-card p-6 shadow-sm"
  >
    <div className="flex flex-col items-center sm:flex-row sm:items-start sm:gap-5">
      {/* Avatar */}
      <div className="group relative mb-4 sm:mb-0">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-3xl font-bold text-primary">
          JD
        </div>
        <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">
          <Camera size={12} />
        </button>
      </div>

      <div className="flex-1 text-center sm:text-left">
        <h2 className="text-lg font-bold text-foreground">John Doe</h2>
        <p className="text-sm text-muted-foreground">Pro Plan · Premium Member</p>

        <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground sm:justify-start">
          <span className="flex items-center gap-1">
            <Mail size={12} /> john@example.com
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={12} /> San Francisco, CA
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={12} /> Joined Jan 2024
          </span>
        </div>
      </div>

      <Button variant="outline" size="sm" className="mt-4 rounded-xl sm:mt-0">
        Edit Profile
      </Button>
    </div>
  </motion.div>
);

export default ProfileCard;
