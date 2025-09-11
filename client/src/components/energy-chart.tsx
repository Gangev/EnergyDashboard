import { useEffect, useRef, memo } from "react";
import { Chart, registerables } from "chart.js";
import { type EnergyData } from "@shared/schema";

Chart.register(...registerables);

const monthNames = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

const formatDateLabel = (dateStr: string): string => {
  const [day, month, year] = dateStr.split('/');
  const monthIndex = parseInt(month) - 1;
  const shortYear = year.slice(-2);
  return `${monthNames[monthIndex]}-${shortYear}`;
};

interface EnergyChartProps {
  data: EnergyData[];
  dataType: "gas" | "power";
  periods: ("consolidato" | "forecast")[];
  timeRangeStart: number;
  timeRangeEnd: number;
}

function EnergyChartComponent({ data, dataType, periods, timeRangeStart: rangeStart, timeRangeEnd: rangeEnd }: EnergyChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const isConsolidatoDate = (dateStr: string): boolean => {
    const date = new Date(dateStr.split('/').reverse().join('-'));
    const currentDate = new Date();
    return date < new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  };


  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Filter out zero rows first (same logic as dashboard)
    const nonZeroData = data.filter(item => !(item.gas === 0 && item.power === 0));

    // Sort data by date to ensure proper line connection (data is already filtered by dashboard)
    const sortedData = [...nonZeroData].sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    });

    const labels = sortedData.map(item => formatDateLabel(item.date));
    const datasets = [];

    // Create gradients
    const consolidatoGradient = ctx.createLinearGradient(0, 0, 0, 400);
    const forecastGradient = ctx.createLinearGradient(0, 0, 0, 400);
    
    if (dataType === 'gas') {
      consolidatoGradient.addColorStop(0, 'hsla(271, 76%, 53%, 0.3)');
      consolidatoGradient.addColorStop(1, 'hsla(271, 76%, 53%, 0.05)');
      forecastGradient.addColorStop(0, 'hsla(300, 60%, 75%, 0.3)');
      forecastGradient.addColorStop(1, 'hsla(300, 60%, 75%, 0.05)');
    } else {
      consolidatoGradient.addColorStop(0, 'hsla(271, 76%, 53%, 0.3)');
      consolidatoGradient.addColorStop(1, 'hsla(271, 76%, 53%, 0.05)');
      forecastGradient.addColorStop(0, 'hsla(300, 60%, 75%, 0.3)');
      forecastGradient.addColorStop(1, 'hsla(300, 60%, 75%, 0.05)');
    }

    if (periods.length === 1) {
      // Single dataset mode
      const values = sortedData.map(item => item[dataType]);
      const isConsolidato = periods[0] === 'consolidato';
      
      datasets.push({
        label: `${dataType === 'gas' ? 'Gas' : 'Power'} - ${isConsolidato ? 'Consolidato' : 'Forecast'}`,
        data: values,
        borderColor: isConsolidato 
          ? (dataType === 'gas' ? 'hsl(271, 76%, 53%)' : 'hsl(271, 76%, 53%)')
          : (dataType === 'gas' ? 'hsl(300, 60%, 75%)' : 'hsl(300, 60%, 75%)'),
        backgroundColor: isConsolidato ? consolidatoGradient : forecastGradient,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: isConsolidato 
          ? (dataType === 'gas' ? 'hsl(271, 76%, 53%)' : 'hsl(271, 76%, 53%)')
          : (dataType === 'gas' ? 'hsl(300, 60%, 75%)' : 'hsl(300, 60%, 75%)'),
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderDash: isConsolidato ? [] : [5, 5]
      });
    } else {
      // Multiple datasets mode - separate consolidato and forecast
      const consolidatoData = sortedData.filter(item => isConsolidatoDate(item.date));
      const forecastData = sortedData.filter(item => !isConsolidatoDate(item.date));
      
      if (periods.includes('consolidato') && consolidatoData.length > 0) {
        const consolidatoLabels = consolidatoData.map(item => item.date);
        const consolidatoValues = consolidatoData.map(item => item[dataType]);
        const consolidatoDataset = Array(labels.length).fill(null);
        
        consolidatoData.forEach(item => {
          const index = labels.indexOf(formatDateLabel(item.date));
          if (index !== -1) {
            consolidatoDataset[index] = item[dataType];
          }
        });
        
        datasets.push({
          label: `${dataType === 'gas' ? 'Gas' : 'Power'} - Consolidato`,
          data: consolidatoDataset,
          borderColor: dataType === 'gas' ? 'hsl(271, 76%, 53%)' : 'hsl(271, 76%, 53%)',
          backgroundColor: consolidatoGradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: dataType === 'gas' ? 'hsl(271, 76%, 53%)' : 'hsl(271, 76%, 53%)',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          spanGaps: false
        });
      }
      
      if (periods.includes('forecast') && forecastData.length > 0) {
        const forecastDataset = Array(labels.length).fill(null);
        
        forecastData.forEach(item => {
          const index = labels.indexOf(formatDateLabel(item.date));
          if (index !== -1) {
            forecastDataset[index] = item[dataType];
          }
        });
        
        datasets.push({
          label: `${dataType === 'gas' ? 'Gas' : 'Power'} - Forecast`,
          data: forecastDataset,
          borderColor: dataType === 'gas' ? 'hsl(300, 60%, 75%)' : 'hsl(300, 60%, 75%)',
          backgroundColor: forecastGradient,
          borderWidth: 3,
          borderDash: [5, 5],
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: dataType === 'gas' ? 'hsl(300, 60%, 75%)' : 'hsl(300, 60%, 75%)',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          spanGaps: false
        });
      }
      
      // Add transition glow between consolidato and forecast sections
      if (periods.includes('consolidato') && periods.includes('forecast') && 
          consolidatoData.length > 0 && forecastData.length > 0) {
        
        // Find the transition points
        const lastConsolidatoIndex = consolidatoData.length > 0 ? 
          labels.indexOf(formatDateLabel(consolidatoData[consolidatoData.length - 1].date)) : -1;
        const firstForecastIndex = forecastData.length > 0 ? 
          labels.indexOf(formatDateLabel(forecastData[0].date)) : -1;
          
        if (lastConsolidatoIndex >= 0 && firstForecastIndex >= 0 && 
            firstForecastIndex > lastConsolidatoIndex) {
          
          const transitionDataset = Array(labels.length).fill(null);
          const lastConsolidatoValue = consolidatoData[consolidatoData.length - 1][dataType];
          const firstForecastValue = forecastData[0][dataType];
          
          // Fill transition area
          for (let i = lastConsolidatoIndex; i <= firstForecastIndex; i++) {
            if (i === lastConsolidatoIndex) {
              transitionDataset[i] = lastConsolidatoValue;
            } else if (i === firstForecastIndex) {
              transitionDataset[i] = firstForecastValue;
            } else {
              // Interpolate between the values
              const progress = (i - lastConsolidatoIndex) / (firstForecastIndex - lastConsolidatoIndex);
              transitionDataset[i] = lastConsolidatoValue + (firstForecastValue - lastConsolidatoValue) * progress;
            }
          }
          
          const transitionGradient = ctx.createLinearGradient(0, 0, 0, 400);
          transitionGradient.addColorStop(0, 'hsla(300, 60%, 75%, 0.3)');
          transitionGradient.addColorStop(1, 'hsla(300, 60%, 75%, 0.05)');
          
          datasets.push({
            label: '',
            data: transitionDataset,
            borderColor: 'hsl(300, 60%, 75%)',
            backgroundColor: transitionGradient,
            borderWidth: 3,
            borderDash: [5, 5],
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 0,
            spanGaps: false
          });
        }
      }
    }

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: periods.length > 1,
            position: 'top' as const,
            labels: {
              color: 'hsl(0, 0%, 69%)',
              usePointStyle: true,
              pointStyle: 'line',
              filter: function(legendItem, chartData) {
                // Nasconde i dataset con label vuota (dataset di transizione)
                return legendItem.text && legendItem.text.trim() !== '';
              }
            }
          },
          tooltip: {
            backgroundColor: 'hsl(0, 0%, 10%)',
            titleColor: 'hsl(0, 0%, 100%)',
            bodyColor: 'hsl(0, 0%, 100%)',
            borderColor: 'hsl(0, 0%, 20%)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: {
              color: 'hsl(0, 0%, 20%)'
            },
            border: {
              color: 'hsl(0, 0%, 40%)'
            },
            ticks: {
              color: 'hsl(0, 0%, 100%)',
              font: {
                size: 13
              }
            }
          },
          y: {
            grid: {
              color: 'hsl(0, 0%, 20%)'
            },
            border: {
              color: 'hsl(0, 0%, 40%)'
            },
            ticks: {
              color: 'hsl(0, 0%, 100%)',
              font: {
                size: 13
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, dataType, periods, rangeStart, rangeEnd]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>Nessun dato disponibile per i filtri selezionati</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Chart Canvas */}
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

export const EnergyChart = memo(EnergyChartComponent);