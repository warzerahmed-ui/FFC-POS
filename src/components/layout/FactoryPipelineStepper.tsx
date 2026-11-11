import React from 'react';
import { useApp } from '../../context/AppContext';
import { Truck, Factory, PackageCheck, ArrowLeft } from 'lucide-react';
import { TabType } from './Sidebar';

interface FactoryPipelineStepperProps {
  activeStage: 'intake' | 'production' | 'ready-for-sale';
  onNavigate: (tab: TabType) => void;
}

export const FactoryPipelineStepper: React.FC<FactoryPipelineStepperProps> = ({
  activeStage,
  onNavigate,
}) => {
  const { intakes, yields, products } = useApp();

  const totalLiveIntakeKg = intakes.reduce((sum, i) => sum + i.netWeightKg, 0);
  const pendingLiveKg = intakes.reduce((sum, i) => sum + i.remainingLiveWeightKg, 0);
  const totalDressedKg = yields.reduce((sum, y) => sum + y.dressedWeightKg, 0);
  const totalReadyKg = products.reduce((sum, p) => sum + p.inStockKg, 0);

  const stages = [
    {
      id: 'intake' as const,
      stepNo: '١',
      title: 'وەرگرتنی مریشک (کێڵگە)',
      metric: `${totalLiveIntakeKg.toLocaleString()} کگم هاتوو`,
      sub: `${pendingLiveKg.toLocaleString()} کگم ماوە بۆ سەربڕین`,
      icon: Truck,
      activeColor: 'bg-[#FF9500] text-white',
      idleBadge: 'bg-[#FF9500]/12 text-[#FF9500]',
    },
    {
      id: 'production' as const,
      stepNo: '٢',
      title: 'سەربڕین و پارچەکردن',
      metric: `${totalDressedKg.toLocaleString()} کگم ئامادەکراو`,
      sub: `${yields.length} وەجبەی سەربڕاو و پارچەکراو`,
      icon: Factory,
      activeColor: 'bg-[#5856D6] text-white',
      idleBadge: 'bg-[#5856D6]/12 text-[#5856D6]',
    },
    {
      id: 'ready-for-sale' as const,
      stepNo: '٣',
      title: 'ئامادە بۆ فرۆشتن',
      metric: `${totalReadyKg.toLocaleString()} کگم لە کۆگا`,
      sub: 'ئامادەیە بۆ فرۆشتنی ڕاستەوخۆ و مەندوب',
      icon: PackageCheck,
      activeColor: 'bg-[#0071E3] text-white',
      idleBadge: 'bg-[#0071E3]/12 text-[#0071E3]',
    },
  ];

  return (
    <div className="apple-card p-3 sm:p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-stretch">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isActive = activeStage === stage.id;
          return (
            <div key={stage.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate(stage.id)}
                className={`flex-1 text-right p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                  isActive
                    ? 'bg-[#F5F5F7] border-[#0071E3]/40 shadow-xs'
                    : 'bg-white border-black/[0.05] hover:bg-[#FBFBFD]'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? stage.activeColor : stage.idleBadge
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-black/[0.06] text-[#515154]">
                      قۆناغی {stage.stepNo}
                    </span>
                    <span className="text-xs font-extrabold text-[#1D1D1F] truncate">
                      {stage.title}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-[#0071E3] mt-0.5 tabular-nums">
                    {stage.metric}
                  </div>
                  <div className="text-[10px] text-[#86868B] truncate">{stage.sub}</div>
                </div>
              </button>

              {idx < stages.length - 1 && (
                <ArrowLeft className="hidden md:block w-4 h-4 text-[#86868B] shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
