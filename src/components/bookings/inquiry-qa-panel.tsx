import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base font-semibold">Client Responses</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Submitted {submittedDate}</p>
          </div>
          {formName && (
            <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground font-medium">
              {formName}
            </span>
          )}
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
