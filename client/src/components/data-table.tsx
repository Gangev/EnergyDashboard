import { type EnergyData } from "@shared/schema";

interface DataTableProps {
  data: EnergyData[];
  dataType: "gas" | "power";
}

export function DataTable({ data, dataType }: DataTableProps) {
  // Formato numeri con 3 decimali e virgola come separatore
  const formatNumber = (num: number, decimals: number = 3): string => {
    return num.toFixed(decimals).replace('.', ',');
  };

  const calculateVariation = (currentValue: number, prevValue: number): { value: number; isPositive: boolean } => {
    const variation = ((currentValue - prevValue) / prevValue) * 100;
    return {
      value: Math.abs(variation),
      isPositive: variation >= 0
    };
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>Nessun dato disponibili per i filtri selezionati</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full">
          <thead className="bg-black sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                {dataType === 'gas' ? 'Gas' : 'Power'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Variazione %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.map((item, index) => {
              const prevItem = data[index - 1];
              let variation = null;
              
              if (prevItem) {
                const currentValue = dataType === 'gas' ? item.gas : item.power;
                const prevValue = dataType === 'gas' ? prevItem.gas : prevItem.power;
                variation = calculateVariation(currentValue, prevValue);
              }
              
              return (
                <tr key={`${item.date}-${index}`} className="data-row transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {item.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                    {dataType === 'gas' ? formatNumber(item.gas) : formatNumber(item.power)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {variation ? (
                      <span className={variation.isPositive ? 'text-green-400' : 'text-red-400'}>
                        {variation.isPositive ? '+' : '-'}{formatNumber(variation.value, 2)}%
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
