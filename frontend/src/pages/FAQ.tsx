import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqItems = [
  {
    question: "How does Nirbhaya calculate safe routes?",
    answer:
      "Nirbhaya combines mock incident density, police station proximity, and route signals to estimate a safety score and suggest safer paths.",
  },
  {
    question: "What happens when I press SOS?",
    answer:
      "SOS immediately triggers emergency flow with your current location and safety details so contacts or responders can act quickly.",
  },
  {
    question: "Can I report incidents anonymously?",
    answer:
      "Yes. You can use anonymous reporting from the report page to help others without sharing your personal identity.",
  },
  {
    question: "Do I need location permission all the time?",
    answer:
      "Location access is needed for core features like route safety and SOS. You can disable it, but those protections will be limited.",
  },
  {
    question: "Can I use Nirbhaya without an account?",
    answer:
      "You can access certain features like report flow. For a full personalized safety experience, log in or create an account.",
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gradient-hero pt-24 pb-12">
      <div className="container mx-auto max-w-3xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8"
        >
          <div className="mb-7 flex items-center gap-3">
            <img src="/nirbhaya.png" alt="Nirbhaya logo" className="h-10 w-10 rounded-xl object-cover" />
            <div>
              <h1 className="font-display text-3xl font-bold">Frequently Asked Questions</h1>
              <p className="text-sm text-muted-foreground">Quick answers about using Nirbhaya safely</p>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-2">
            {faqItems.map((item, index) => (
              <AccordionItem key={item.question} value={`item-${index}`} className="rounded-xl border border-border px-4">
                <AccordionTrigger className="text-left text-sm sm:text-base">{item.question}</AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </div>
  );
}
