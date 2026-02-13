import { useNavigate } from "react-router-dom";

export function BackButton({ to }: { to: string }) {
  const navigate = useNavigate();
  return (
    <button className="admin-back" onClick={() => navigate(to)}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
