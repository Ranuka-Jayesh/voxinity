import { Link } from "react-router-dom";
import { Github, Linkedin, Twitter, Mail } from "lucide-react";
import { TextHoverEffect, FooterBackgroundGradient } from "@/components/ui/hover-footer";

const Footer = () => {
  const year = new Date().getFullYear();

  const footerLinks = [
    {
      title: "Product",
      links: [
        { label: "Demo", href: "/demo" },
        { label: "Extension", href: "/extension" },
        { label: "How It Works", href: "/how-it-works" },
        { label: "Pricing", href: "/pricing" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Help & FAQ", href: "/help" },
        { label: "About", href: "/about" },
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Service", href: "#" },
      ],
    },
  ];

  const socialLinks = [
    { icon: <Github size={18} />, label: "GitHub", href: "#" },
    { icon: <Linkedin size={18} />, label: "LinkedIn", href: "#" },
    { icon: <Twitter size={18} />, label: "Twitter", href: "#" },
    { icon: <Mail size={18} />, label: "Email", href: "mailto:hello@voxinity.com" },
  ];

  return (
    <footer className="relative border-t border-border bg-muted/30">
      <FooterBackgroundGradient />

      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="font-display text-lg font-bold">Voxinity</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Real-time multilingual dubbing & accessibility for everyone.
            </p>
          </div>

          {/* Link sections */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="font-display font-semibold mb-3 text-sm">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Connect */}
          <div>
            <h4 className="font-display font-semibold mb-3 text-sm">Connect</h4>
            <div className="flex gap-3">
              {socialLinks.map(({ icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="rounded-lg p-2 text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                  aria-label={label}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <div className="flex gap-3">
            {socialLinks.map(({ icon, label, href }) => (
              <a
                key={label}
                href={href}
                className="rounded-lg p-2 text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                aria-label={label}
              >
                {icon}
              </a>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">© {year} Voxinity. All rights reserved.</p>
        </div>
      </div>

      {/* Text hover effect */}
      <div className="flex items-center justify-center pb-8 overflow-hidden">
        <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl">
          <TextHoverEffect text="VOXINITY" />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
