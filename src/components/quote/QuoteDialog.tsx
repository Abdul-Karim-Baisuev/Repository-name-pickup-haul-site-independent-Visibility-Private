import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuoteDialog } from "./QuoteDialogContext";
import QuoteForm from "./QuoteForm";

const QuoteDialog = () => {
  const { isOpen, setOpen, close } = useQuoteDialog();

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl glass border-white/10 rounded-3xl p-6 md:p-8">
        <DialogHeader className="space-y-3 text-left">
          <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium">
            Instant Quote · Form 02
          </div>
          <DialogTitle className="text-3xl md:text-4xl font-bold tracking-tight">
            Request <span className="text-gradient-primary">Estimate</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground font-light">
            Send the job details and we'll confirm the exact price before dispatch.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <QuoteForm idPrefix="dialog-quote" compact onSuccess={close} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteDialog;
