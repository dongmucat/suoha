import { X } from 'lucide-react';

const handRankings = [
  { name: '皇家同花顺', desc: '同花色的 A-K-Q-J-10' },
  { name: '同花顺', desc: '同花色的五张连续牌' },
  { name: '四条', desc: '四张相同点数的牌' },
  { name: '葫芦', desc: '三条加一对' },
  { name: '同花', desc: '五张相同花色的牌' },
  { name: '顺子', desc: '五张连续点数的牌' },
  { name: '三条', desc: '三张相同点数的牌' },
  { name: '两对', desc: '两组不同的对子' },
  { name: '一对', desc: '两张相同点数的牌' },
  { name: '高牌', desc: '不符合以上任何牌型，以最大单牌比较' },
];

const gameFlow = [
  { stage: '翻牌前 (Pre-flop)', desc: '每位玩家获得两张底牌，进行第一轮下注' },
  { stage: '翻牌 (Flop)', desc: '公开三张公共牌，进行第二轮下注' },
  { stage: '转牌 (Turn)', desc: '公开第四张公共牌，进行第三轮下注' },
  { stage: '河牌 (River)', desc: '公开第五张公共牌，进行最后一轮下注' },
  { stage: '摊牌 (Showdown)', desc: '剩余玩家亮牌比较，最佳五张牌组合者获胜' },
];

export default function PokerRulesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-3xl bg-card p-6 shadow-[var(--shadow-cute-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">德州扑克规则</h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg p-2"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          <section className="mb-5">
            <h4 className="mb-2 text-sm font-semibold text-text-primary">
              牌型大小（从大到小）
            </h4>
            <ol className="space-y-1.5">
              {handRankings.map((h, i) => (
                <li key={i} className="text-sm text-text-secondary">
                  <span className="font-bold text-text-primary">{i + 1}. {h.name}</span>
                  {' — '}{h.desc}
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold text-text-primary">
              游戏流程
            </h4>
            <ol className="space-y-1.5">
              {gameFlow.map((g, i) => (
                <li key={i} className="text-sm text-text-secondary">
                  <span className="font-bold text-text-primary">{g.stage}</span>
                  {' — '}{g.desc}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
