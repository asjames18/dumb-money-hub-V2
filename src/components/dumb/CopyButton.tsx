import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      // Contract/pair/dead-address copies signal real token intent; other
      // copies (report links) stay untracked. Labels are in-repo and stable.
      if (/address/i.test(label)) trackEvent("copy_contract");
      toast.success(`${label} copied`, { description: "Paste it and post it." });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Clipboard blocked", { description: "Select the text and copy manually." });
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={copy}
      aria-label={`Copy ${label}`}
      className="h-7 gap-1 rounded-md border-border bg-secondary px-2 text-[11px] font-medium text-muted-foreground hover:bg-primary hover:text-primary-foreground"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
