import { InlineNotice } from "@/src/components/ui/inline-notice";

type NoticeStackProps = {
  submitError?: string;
  submitSuccess?: string;
  loadError?: string;
  className?: string;
};

export function NoticeStack({ submitError, submitSuccess, loadError, className = "mt-4" }: NoticeStackProps) {
  if (!submitError && !submitSuccess && !loadError) return null;

  return (
    <>
      {submitError ? <InlineNotice className={className} tone="danger" message={submitError} /> : null}
      {submitSuccess ? <InlineNotice className={className} tone="success" message={submitSuccess} /> : null}
      {loadError ? <InlineNotice className={className} tone="danger" message={loadError} /> : null}
    </>
  );
}
