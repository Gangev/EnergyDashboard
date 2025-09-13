import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { flushSync } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ChartLine, Calendar, Table, Zap, TrendingUp, Activity, BarChart3, Flame, Wind, Layers, Database, Play, Triangle, Download, FileSpreadsheet, ChevronDown, ExternalLink } from "lucide-react";
import { fetchEnergyData } from "@/lib/energy-api";
import { type FilterOptions } from "@shared/schema";
import { CompactFilterBar } from "@/components/compact-filter-bar";
import { EnergyChart } from "@/components/energy-chart";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function EnergyDashboard() {
  const [filters, setFilters] = useState<FilterOptions>({
    period: ["consolidato", "forecast"],
    type: "gas",
    startDate: "",
    endDate: ""
  });
  
  const [showDataTable, setShowDataTable] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportCommodity, setExportCommodity] = useState<('gas' | 'power')[]>(['gas', 'power']);
  const [isExporting, setIsExporting] = useState(false);
  
  // Time range control for chart - ora basato sui mesi disponibili
  const [timeRangeStart, setTimeRangeStart] = useState(0);
  const [timeRangeEnd, setTimeRangeEnd] = useState(100);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout>();

  // Mouse event handlers for time range slider
  const handleMouseDown = (type: 'start' | 'end', e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(type);
  };

  const { data: sheetData, isLoading, error } = useQuery({
    queryKey: ["/api/energy-data"],
    queryFn: fetchEnergyData,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Debug logging
  useEffect(() => {
    console.log("🔄 Dashboard state:", {
      isLoading,
      hasError: !!error,
      hasData: !!sheetData,
      dataPreview: sheetData ? { fileDate: sheetData.fileDate, dataCount: sheetData.data?.length } : null
    });
  }, [sheetData, isLoading, error]);

  const isConsolidatoDate = (dateStr: string): boolean => {
    const date = new Date(dateStr.split('/').reverse().join('-'));
    const currentDate = new Date();
    const cutoffDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    return date < new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  };

  const getFilteredData = () => {
    if (!sheetData?.data) return [];
    
    return sheetData.data.filter(item => {
      // Filter out zero rows
      if (item.gas === 0 && item.power === 0) return false;
      
      // Period filter
      const isConsolidato = isConsolidatoDate(item.date);
      const shouldIncludeConsolidato = filters.period.includes('consolidato') && isConsolidato;
      const shouldIncludeForecast = filters.period.includes('forecast') && !isConsolidato;
      if (!shouldIncludeConsolidato && !shouldIncludeForecast) return false;
      
      // Date range filter
      if (filters.startDate) {
        const itemDate = new Date(item.date.split('/').reverse().join('-'));
        const startDate = new Date(filters.startDate.split('/').reverse().join('-'));
        if (itemDate < startDate) return false;
      }
      
      if (filters.endDate) {
        const itemDate = new Date(item.date.split('/').reverse().join('-'));
        const endDate = new Date(filters.endDate.split('/').reverse().join('-'));
        if (itemDate > endDate) return false;
      }
      
      return true;
    });
  };

  const getAvailableDates = (): string[] => {
    if (!sheetData?.data) return [];
    
    return sheetData.data
      .filter(item => {
        // Filter out zero rows
        if (item.gas === 0 && item.power === 0) return false;
        
        const isConsolidato = isConsolidatoDate(item.date);
        const shouldIncludeConsolidato = filters.period.includes('consolidato') && isConsolidato;
        const shouldIncludeForecast = filters.period.includes('forecast') && !isConsolidato;
        return shouldIncludeConsolidato || shouldIncludeForecast;
      })
      .map(item => item.date);
  };

  // Get all available dates for export (regardless of current filters)
  const getAllAvailableDates = (): string[] => {
    if (!sheetData?.data) return [];
    
    return sheetData.data
      .filter(item => !(item.gas === 0 && item.power === 0))
      .map(item => item.date)
      .sort((a, b) => {
        const dateA = new Date(a.split('/').reverse().join('-'));
        const dateB = new Date(b.split('/').reverse().join('-'));
        return dateA.getTime() - dateB.getTime();
      });
  };

  // Format date for display in export dropdowns
  const formatDateForExport = (dateStr: string): string => {
    const [day, month, year] = dateStr.split('/');
    const monthNames = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
    const monthIndex = parseInt(month) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  };

  // Funzioni per gestire i mesi disponibili (simili al compact-filter-bar)
  const getUniqueMonthYears = (dates: string[]): string[] => {
    const monthYears = new Set<string>();
    dates.forEach(dateStr => {
      const [day, month, year] = dateStr.split('/');
      const monthYear = `${month}/${year}`;
      monthYears.add(monthYear);
    });
    return Array.from(monthYears).sort((a, b) => {
      const [monthA, yearA] = a.split('/').map(n => parseInt(n));
      const [monthB, yearB] = b.split('/').map(n => parseInt(n));
      if (yearA !== yearB) return yearA - yearB;
      return monthA - monthB;
    });
  };

  // Converte percentuale slider in mese
  const percentToMonthYear = (percent: number, availableMonths: string[]): string => {
    if (availableMonths.length === 0) return '';
    if (availableMonths.length === 1) return availableMonths[0];
    const index = Math.round((percent / 100) * (availableMonths.length - 1));
    return availableMonths[Math.max(0, Math.min(availableMonths.length - 1, index))];
  };

  // Converte mese in percentuale slider  
  const monthYearToPercent = (monthYear: string, availableMonths: string[]): number => {
    if (availableMonths.length === 0) return 0;
    const index = availableMonths.indexOf(monthYear);
    if (index === -1) return 0;
    return (index / (availableMonths.length - 1)) * 100;
  };

  // Formatta la data per il display
  const formatDateForSlider = (monthYear: string): string => {
    if (!monthYear) return '';
    const [month, year] = monthYear.split('/');
    const monthNames = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
    const monthIndex = parseInt(month) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  };

  // Export data function
  const handleExportData = async () => {
    if (!exportStartDate || !exportEndDate) {
      alert("Seleziona entrambe le date per l'export");
      return;
    }

    setIsExporting(true);
    
    try {
      // Get ALL data (not filtered by current dashboard filters) and filter only by export date range
      const allData = sheetData?.data?.filter(item => !(item.gas === 0 && item.power === 0)) || [];
      
      const exportData = allData.filter(item => {
        if (!exportStartDate || !exportEndDate) return true;
        
        const itemDate = new Date(item.date.split('/').reverse().join('-'));
        const startDate = new Date(exportStartDate.split('/').reverse().join('-'));
        const endDate = new Date(exportEndDate.split('/').reverse().join('-'));
        
        return itemDate >= startDate && itemDate <= endDate;
      });

      // Create CSV content with European format (semicolon separator, comma for decimals)
      let csvHeader = "Data";
      let csvContent = "";
      
      const includeGas = exportCommodity.includes('gas');
      const includePower = exportCommodity.includes('power');
      
      if (includeGas) csvHeader += ";Gas";
      if (includePower) csvHeader += ";Power";
      csvHeader += "\n";
      
      csvContent = exportData.map(item => {
        let row = item.date;
        if (includeGas) row += `;${item.gas.toString().replace('.', ',')}`;
        if (includePower) row += `;${item.power.toString().replace('.', ',')}`;
        return row;
      }).join("\n");
      
      const csvData = csvHeader + csvContent;
      
      // Create and download file
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      const commodityStr = exportCommodity.length === 2 ? 'all' : exportCommodity[0];
      link.setAttribute("download", `energy_data_${commodityStr}_${exportStartDate.replace(/\//g, '-')}_${exportEndDate.replace(/\//g, '-')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error("Export failed:", error);
      alert("Errore durante l'export dei dati");
    } finally {
      setIsExporting(false);
    }
  };

  const filteredData = useMemo(() => getFilteredData(), [sheetData?.data, filters]);
  const availableDates = useMemo(() => getAvailableDates(), [sheetData?.data, filters]);

  const updateFiltersFromSlider = useCallback((startPercent: number, endPercent: number) => {
    const availableMonths = getUniqueMonthYears(availableDates);
    if (availableMonths.length === 0) return;

    const startMonth = percentToMonthYear(startPercent, availableMonths);
    const endMonth = percentToMonthYear(endPercent, availableMonths);
    
    if (startMonth && endMonth) {
      const [startMonthNum, startYear] = startMonth.split('/');
      const [endMonthNum, endYear] = endMonth.split('/');
      
      const startDatesInMonth = availableDates.filter(date => {
        const [day, dateMonth, dateYear] = date.split('/');
        return dateMonth === startMonthNum && dateYear === startYear;
      });
      
      const endDatesInMonth = availableDates.filter(date => {
        const [day, dateMonth, dateYear] = date.split('/');
        return dateMonth === endMonthNum && dateYear === endYear;
      });
      
      if (startDatesInMonth.length > 0 && endDatesInMonth.length > 0) {
        const firstDate = startDatesInMonth.sort()[0];
        const lastDate = endDatesInMonth.sort()[endDatesInMonth.length - 1];
        
        setFilters(prev => ({
          ...prev,
          startDate: firstDate,
          endDate: lastDate
        }));
      }
    }
  }, [availableDates]);

  const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!isDragging) return;
    
    const availableMonths = getUniqueMonthYears(availableDates);
    if (availableMonths.length === 0) return;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    
    if (isDragging === 'start') {
      const minGap = 100 / Math.max(1, availableMonths.length - 1);
      const newStart = Math.max(0, Math.min(timeRangeEnd - minGap, clickPercent));
      
      // Force immediate visual update
      flushSync(() => {
        setTimeRangeStart(newStart);
      });
      
      // Debounce filter updates to reduce flickering
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
      dragTimeoutRef.current = setTimeout(() => {
        updateFiltersFromSlider(newStart, timeRangeEnd);
      }, 100);
      
    } else if (isDragging === 'end') {
      const minGap = 100 / Math.max(1, availableMonths.length - 1);
      const newEnd = Math.min(100, Math.max(timeRangeStart + minGap, clickPercent));
      
      // Force immediate visual update
      flushSync(() => {
        setTimeRangeEnd(newEnd);
      });
      
      // Debounce filter updates to reduce flickering
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
      dragTimeoutRef.current = setTimeout(() => {
        updateFiltersFromSlider(timeRangeStart, newEnd);
      }, 100);
    }
  }, [isDragging, availableDates, timeRangeStart, timeRangeEnd, updateFiltersFromSlider]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      // Clear any pending debounced updates
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
      // Update filters immediately on mouse up
      updateFiltersFromSlider(timeRangeStart, timeRangeEnd);
    }
    setIsDragging(null);
  }, [isDragging, timeRangeStart, timeRangeEnd, updateFiltersFromSlider]);

  // Global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const sliderContainer = document.querySelector('.slider-container');
        if (sliderContainer) {
          const rect = sliderContainer.getBoundingClientRect();
          const clickPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
          
          const availableMonths = getUniqueMonthYears(availableDates);
          if (availableMonths.length === 0) return;
          
          if (isDragging === 'start') {
            const minGap = 100 / Math.max(1, availableMonths.length - 1);
            const newStart = Math.max(0, Math.min(timeRangeEnd - minGap, clickPercent));
            
            // Force immediate visual update
            flushSync(() => {
              setTimeRangeStart(newStart);
            });
            
            // Debounce filter updates
            if (dragTimeoutRef.current) {
              clearTimeout(dragTimeoutRef.current);
            }
            dragTimeoutRef.current = setTimeout(() => {
              updateFiltersFromSlider(newStart, timeRangeEnd);
            }, 100);
            
          } else if (isDragging === 'end') {
            const minGap = 100 / Math.max(1, availableMonths.length - 1);
            const newEnd = Math.min(100, Math.max(timeRangeStart + minGap, clickPercent));
            
            // Force immediate visual update
            flushSync(() => {
              setTimeRangeEnd(newEnd);
            });
            
            // Debounce filter updates
            if (dragTimeoutRef.current) {
              clearTimeout(dragTimeoutRef.current);
            }
            dragTimeoutRef.current = setTimeout(() => {
              updateFiltersFromSlider(timeRangeStart, newEnd);
            }, 100);
          }
        }
      };
      
      const handleGlobalMouseUp = handleMouseUp;
      
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, timeRangeStart, timeRangeEnd, availableDates, handleMouseUp, updateFiltersFromSlider]);

  // Sincronizza slider con filtri "Da:" e "A:"
  useEffect(() => {
    const availableMonths = getUniqueMonthYears(availableDates);
    if (availableMonths.length === 0) return;

    // Se esistono filtri startDate e endDate, aggiorna lo slider
    if (filters.startDate && filters.endDate) {
      const [startDay, startMonth, startYear] = filters.startDate.split('/');
      const [endDay, endMonth, endYear] = filters.endDate.split('/');
      
      const startMonthYear = `${startMonth}/${startYear}`;
      const endMonthYear = `${endMonth}/${endYear}`;
      
      const startPercent = monthYearToPercent(startMonthYear, availableMonths);
      const endPercent = monthYearToPercent(endMonthYear, availableMonths);
      
      setTimeRangeStart(startPercent);
      setTimeRangeEnd(endPercent);
    } else {
      // Default: primo e ultimo mese disponibili
      setTimeRangeStart(0);
      setTimeRangeEnd(100);
    }
  }, [filters.startDate, filters.endDate, availableDates, isDragging]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  // Sincronizza slider con filtri "Da:" e "A:" solo quando non è attivo il dragging 
  useEffect(() => {
    if (isDragging) return; // Non aggiornare durante il dragging
    
    const availableMonths = getUniqueMonthYears(availableDates);
    if (availableMonths.length === 0) {
      setTimeRangeStart(0);
      setTimeRangeEnd(100);
      return;
    }

    // Se esistono filtri startDate e endDate, aggiorna lo slider
    if (filters.startDate && filters.endDate) {
      const [startDay, startMonth, startYear] = filters.startDate.split('/');
      const [endDay, endMonth, endYear] = filters.endDate.split('/');
      
      const startMonthYear = `${startMonth}/${startYear}`;
      const endMonthYear = `${endMonth}/${endYear}`;
      
      const startPercent = monthYearToPercent(startMonthYear, availableMonths);
      const endPercent = monthYearToPercent(endMonthYear, availableMonths);
      
      setTimeRangeStart(startPercent);
      setTimeRangeEnd(endPercent);
    } else {
      // Default: primo e ultimo mese disponibili
      setTimeRangeStart(0);
      setTimeRangeEnd(100);
    }
  }, [filters.startDate, filters.endDate, availableDates, isDragging]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <Alert className="max-w-md border-destructive">
          <AlertDescription className="text-destructive">
            Errore nel caricamento dei dati: {error instanceof Error ? error.message : 'Errore sconosciuto'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-surface border-b border-gray-800 py-4">
        <div className="max-w-[90rem] mx-auto px-6 xl:px-8 2xl:px-12">
          <div className="flex items-center justify-between">
            {/* Left side - EnergyDashboard Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center text-xl font-bold">
                  <span className="text-white">Energy</span>
                  <span className="text-purple-500">Dashboard</span>
                </div>
                <span className="text-sm text-gray-400 font-medium tracking-wide">Real Time Analytics</span>
              </div>
            </div>


            {/* Right side - Status info */}
            <div className="flex items-center space-x-4 xl:space-x-6">
              <div className="text-xs xl:text-sm 2xl:text-base text-gray-400">
                <Calendar className="inline h-3 w-3 xl:h-4 xl:w-4 2xl:h-5 2xl:w-5 mr-2" />
                <span>Data File: </span>
                {isLoading ? (
                  <Skeleton className="inline-block w-16 xl:w-20 2xl:w-24 h-3 xl:h-4 2xl:h-5" />
                ) : (
                  <span className="text-purple-500 font-medium">{sheetData?.fileDate}</span>
                )}
              </div>
              <div className="w-2 h-2 xl:w-3 xl:h-3 2xl:w-4 2xl:h-4 bg-green-500 rounded-full pulse"></div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[90rem] mx-auto px-6 xl:px-8 2xl:px-12 py-4 xl:py-6 2xl:py-8">
        {/* Compact Filter Bar */}
        <CompactFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          availableDates={availableDates}
          isLoading={isLoading}
        />

        {/* Chart and Data Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Chart Section */}
          <div className={`${showDataTable ? 'lg:col-span-8' : 'lg:col-span-12'} bg-surface rounded-xl p-6 border border-gray-800 chart-container transition-all duration-300`}>
            <div className="flex items-center justify-between mb-4 xl:mb-6">
              <h2 className="text-xl xl:text-2xl 2xl:text-3xl font-semibold">
                Andamento {filters.type === 'gas' ? 'Gas' : 'Power'} - {
                  filters.period.length === 2 
                    ? 'Consolidato + Forecast' 
                    : filters.period[0] === 'consolidato' 
                      ? 'Consolidato' 
                      : 'Forecast'
                }
              </h2>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDataTable(!showDataTable)}
                  className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 border-0 text-white font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50"></div>
                  <div className="relative flex items-center space-x-2">
                    <Table className={`h-4 w-4 xl:h-5 xl:w-5 transition-all duration-200 ${
                      showDataTable ? 'rotate-0' : 'rotate-3'
                    }`} />
                    <span className="text-sm xl:text-base">
                      {showDataTable ? 'Nascondi Dati' : 'Mostra Dati'}
                    </span>
                  </div>
                </Button>
                {isLoading && (
                  <div className="loading-spinner w-6 h-6 rounded-full"></div>
                )}
              </div>
            </div>
            
            {/* Time Range Slider */}
            <div className="mb-6">
              <div className="bg-black/60 rounded-lg px-3 py-2 border border-gray-700">
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-400 font-medium min-w-[45px] flex-shrink-0">Periodo:</span>
                  
                  {/* Start date */}
                  <span className="text-xs text-gray-300 font-medium min-w-[60px] flex-shrink-0">
                    {(() => {
                      const availableMonths = getUniqueMonthYears(availableDates);
                      if (availableMonths.length === 0) return "";
                      const startMonth = percentToMonthYear(timeRangeStart, availableMonths);
                      return formatDateForSlider(startMonth);
                    })()}
                  </span>

                  {/* Custom dual range slider */}
                  <div 
                    className="relative flex-1 h-5 slider-container"
                    onMouseUp={handleMouseUp}
                  >
                    {/* Track background */}
                    <div 
                      className="absolute top-1/2 transform -translate-y-1/2 w-full h-2 bg-gray-700 rounded-full"
                    ></div>
                    
                    {/* Selected range */}
                    <div 
                      className="absolute top-1/2 transform -translate-y-1/2 h-3 bg-gradient-to-r from-purple-600 to-violet-500 rounded-full shadow-lg"
                      style={{
                        left: `${timeRangeStart}%`,
                        width: `${timeRangeEnd - timeRangeStart}%`
                      }}
                    >
                      {/* Visual grip indicators */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex space-x-0.5">
                          <div className="w-0.5 h-2 bg-white/40 rounded-full"></div>
                          <div className="w-0.5 h-2 bg-white/40 rounded-full"></div>
                          <div className="w-0.5 h-2 bg-white/40 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Start handle */}
                    <div
                      className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full border-2 border-purple-500 shadow-lg cursor-ew-resize z-10"
                      style={{ left: `${timeRangeStart}%` }}
                      onMouseDown={(e) => handleMouseDown('start', e)}
                    ></div>
                    
                    {/* End handle */}
                    <div
                      className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full border-2 border-purple-500 shadow-lg cursor-ew-resize z-10"
                      style={{ left: `${timeRangeEnd}%` }}
                      onMouseDown={(e) => handleMouseDown('end', e)}
                    ></div>
                  </div>

                  {/* End date */}
                  <span className="text-xs text-gray-300 font-medium min-w-[60px] text-right flex-shrink-0">
                    {(() => {
                      const availableMonths = getUniqueMonthYears(availableDates);
                      if (availableMonths.length === 0) return "";
                      const endMonth = percentToMonthYear(timeRangeEnd, availableMonths);
                      return formatDateForSlider(endMonth);
                    })()}
                  </span>
                </div>
              </div>
            </div>
            <div className="relative h-80 xl:h-96 2xl:h-[28rem]">
              {isLoading ? (
                <Skeleton className="w-full h-full" />
              ) : (
                <EnergyChart 
                  data={filteredData} 
                  dataType={filters.type} 
                  periods={filters.period}
                  timeRangeStart={timeRangeStart}
                  timeRangeEnd={timeRangeEnd}
                />
              )}
            </div>
          </div>

          {/* Data Table - Conditional - Right Side */}
          {showDataTable && (
            <div className="lg:col-span-4 bg-surface rounded-xl border border-gray-800 overflow-hidden animate-in fade-in-50 slide-in-from-right-2 duration-300 h-[30rem] xl:h-[34rem] 2xl:h-[40rem] flex flex-col">
              <div className="px-4 py-3 border-b border-gray-800 flex-shrink-0">
                <h3 className="text-sm font-semibold">
                  <Table className="inline h-4 w-4 mr-2 text-purple-500" />
                  Dati
                </h3>
              </div>
              {isLoading ? (
                <div className="flex-1 p-4">
                  <Skeleton className="w-full h-full" />
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-2 flex-shrink-0">
                    {/* Header */}
                    <div className="flex justify-between items-center py-2 px-2 border-b border-gray-700">
                      <span className="text-gray-500 text-[10px] font-medium w-16">DATA</span>
                      <span className="text-gray-500 text-[10px] font-medium">{filters.type.toUpperCase()}</span>
                      <span className="text-gray-500 text-[10px] font-medium w-12 text-right">VAR%</span>
                    </div>
                  </div>
                  
                  {/* Scrollable Data Rows */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4" style={{minHeight: '0'}}>
                    <div className="space-y-1">
                      {filteredData.map((item, index) => (
                        <div key={`${item.date}-${index}`} className="flex justify-between items-center py-1 px-2 rounded text-xs hover:bg-gray-800 transition-colors">
                          <span className="text-gray-400 w-16 text-[10px]">
                            {(() => {
                              const [day, month, year] = item.date.split('/');
                              const monthNames = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
                              const monthIndex = parseInt(month) - 1;
                              return `${monthNames[monthIndex]} ${year}`;
                            })()}
                          </span>
                          <span className="text-white font-medium text-xs">
                            {filters.type === 'gas' ? item.gas.toFixed(3).replace('.', ',') : item.power.toFixed(3).replace('.', ',')}
                          </span>
                          {index > 0 ? (
                            <span className={`text-[10px] w-12 text-right ${
                              ((filters.type === 'gas' ? item.gas : item.power) - 
                               (filters.type === 'gas' ? filteredData[index-1].gas : filteredData[index-1].power)) >= 0 
                                ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {(((filters.type === 'gas' ? item.gas : item.power) - 
                                 (filters.type === 'gas' ? filteredData[index-1].gas : filteredData[index-1].power)) / 
                                 (filters.type === 'gas' ? filteredData[index-1].gas : filteredData[index-1].power) * 100).toFixed(2).replace('.', ',')}%
                            </span>
                          ) : (
                            <span className="text-gray-600 w-12 text-right text-[10px]">-</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export Section */}
        <div className="bg-surface rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-violet-600 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Export Dati</h2>
                <p className="text-sm text-gray-400">Scarica i dati in formato CSV per il periodo selezionato</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
            {/* Commodity Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Commodity</label>
              <div className="flex gap-1 bg-black rounded-lg p-1 border border-gray-700 shadow-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`filter-button px-2 py-2 text-xs font-medium rounded-md flex-1 ${
                    exportCommodity.includes('gas') ? 'active' : ''
                  }`}
                  onClick={() => {
                    const newCommodities = exportCommodity.includes('gas') 
                      ? exportCommodity.filter(c => c !== 'gas')
                      : [...exportCommodity, 'gas'];
                    if (newCommodities.length === 0) {
                      setExportCommodity(['gas']);
                    } else {
                      setExportCommodity(newCommodities as ('gas' | 'power')[]);
                    }
                  }}
                >
                  <Flame className="h-3 w-3 mr-1" />
                  Gas
                </Button>
                <div className="w-px bg-gray-600 my-1"></div>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`filter-button px-2 py-2 text-xs font-medium rounded-md flex-1 ${
                    exportCommodity.includes('power') ? 'active' : ''
                  }`}
                  onClick={() => {
                    const newCommodities = exportCommodity.includes('power') 
                      ? exportCommodity.filter(c => c !== 'power')
                      : [...exportCommodity, 'power'];
                    if (newCommodities.length === 0) {
                      setExportCommodity(['power']);
                    } else {
                      setExportCommodity(newCommodities as ('gas' | 'power')[]);
                    }
                  }}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Power
                </Button>
              </div>
            </div>

            {/* Data Inizio */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Data Inizio</label>
              <select 
                value={exportStartDate} 
                onChange={(e) => setExportStartDate(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all duration-200 shadow-sm custom-scrollbar"
              >
                <option value="" className="bg-black text-white">Seleziona data inizio</option>
                {getAllAvailableDates().map((date) => (
                  <option key={date} value={date} className="bg-black text-white">
                    {formatDateForExport(date)}
                  </option>
                ))}
              </select>
            </div>

            {/* Data Fine */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Data Fine</label>
              <select 
                value={exportEndDate} 
                onChange={(e) => setExportEndDate(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all duration-200 shadow-sm custom-scrollbar"
              >
                <option value="" className="bg-black text-white">Seleziona data fine</option>
                {getAllAvailableDates().map((date) => (
                  <option key={date} value={date} className="bg-black text-white">
                    {formatDateForExport(date)}
                  </option>
                ))}
              </select>
            </div>

            {/* Pulsante Export */}
            <div className="space-y-2">
              <Button
                onClick={handleExportData}
                disabled={isExporting || !exportStartDate || !exportEndDate}
                className="w-full relative overflow-hidden bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 border-0 text-white font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50"></div>
                <div className="relative flex items-center justify-center space-x-2">
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Esportando...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Esporta CSV</span>
                    </>
                  )}
                </div>
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-start space-x-2">
              <div className="w-4 h-4 mt-0.5 text-purple-500">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm text-gray-300">
                <p>Il file CSV conterrà i dati secondo le commodity selezionate (Gas/Power) per il periodo scelto. Verranno inclusi sia i dati consolidati che le previsioni per l'intervallo di date specificato.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-gray-800 bg-surface/50 backdrop-blur-sm">
        <div className="max-w-[90rem] mx-auto px-6 xl:px-8 2xl:px-12 py-4">
          <div className="text-center">
            <p className="text-gray-400 text-xs xl:text-sm">
              Energy Dashboard - Progettato e sviluppato da{' '}
              <a href="https://gangemilorenzo.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-purple-500 font-medium hover:text-purple-400 transition-colors">
                Lorenzo Gangemi
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
