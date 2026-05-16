import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/booking-section";
import type { InquiryAnswer } from "@/lib/types/database";

interface Props {
  answers: InquiryAnswer[];
  formName: string | null;
  submittedAt: string;
}

export function InquiryQAPanel({ answers, formName, submittedAt }: Props) {
  if (answers.length === 0) return null;

  const submittedDate = format(parseISO(submittedAt), "d MMMM yyyy");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Client responses
          </CardTitle>
          <div className="flex items-center gap-2">
            {formName && (
              <span className="text-xs text-muted-foreground">{formName}</span>
            )}
            <span className="text-xs text-muted-foreground">{submittedDate}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {answers.map((answer) => (
            <li key={answer.id} className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-snug">
                {answer.question_text}
              </p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {answer.answer_value || <span className="text-muted-foreground/60 italic">No answer provided</span>}
              </p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
