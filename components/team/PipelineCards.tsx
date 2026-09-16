import type { Member } from "@/lib/types";

const STAGE_DESCRIPTIONS: Record<string, string> = {
  BA: "Nhận yêu cầu, phân tích, chia thành feature và acceptance criteria",
  TA: "Phân tích kỹ thuật, chia task, tự code hoặc chuyển cho dev agent",
  Dev: "Pull context và task, code, viết test, mở PR chờ người review",
  Index: "Index docs thành kho tri thức để mọi agent đọc qua docs.search",
};

export function PipelineCards({ pipeline }: { pipeline: { stage: string; agent: Member }[] }) {
  return (
    <div className="pipeline-cards">
      {pipeline.map(({ stage, agent }) => (
        <div className="pipeline-card" key={agent.id}>
          <div className="pipeline-card-stage">
            <span className="pipeline-dot" /> {stage} agent
          </div>
          <div className="pipeline-card-name">{agent.name}</div>
          <div className="pipeline-card-desc">{STAGE_DESCRIPTIONS[stage]}</div>
        </div>
      ))}
    </div>
  );
}
