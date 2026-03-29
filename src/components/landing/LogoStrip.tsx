const COMPANIES = ["Gong", "HubSpot", "Salesforce", "Datadog", "Outreach", "Snowflake", "CrowdStrike", "Mimecast"];

export function LogoStrip() {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-10 px-6 sm:px-14 py-6 border-b border-[#E8E4DF]">
      <span className="text-[11px] text-[#9B8E82] whitespace-nowrap font-medium tracking-[0.06em] uppercase flex-shrink-0">Candidates prepping for</span>
      <div className="flex items-center gap-5 sm:gap-7 flex-wrap">
        {COMPANIES.map((name) => (
          <span key={name} className="text-[13px] font-medium text-[#9B8E82] opacity-40 hover:opacity-80 transition-opacity duration-300 cursor-default">{name}</span>
        ))}
      </div>
    </div>
  );
}
