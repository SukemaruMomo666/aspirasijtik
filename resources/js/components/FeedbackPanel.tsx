type FeedbackPanelProps = {
  variant: 'loading' | 'error' | 'empty';
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
};

export default function FeedbackPanel({
  variant,
  title,
  message,
  actionLabel,
  onAction,
  actionDisabled = false,
}: FeedbackPanelProps) {
  return (
    <section className={`ui-feedback ui-feedback-${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      {variant === 'loading' && <span className="ui-feedback-spinner" aria-hidden="true" />}
      <div className="ui-feedback-copy">
        <b>{title}</b>
        {message && <p>{message}</p>}
      </div>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} disabled={actionDisabled}>{actionLabel}</button>
      )}
    </section>
  );
}
