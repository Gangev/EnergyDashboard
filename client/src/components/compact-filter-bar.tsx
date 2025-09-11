import { Flame, Zap, ChevronDown } from "lucide-react";
import { type FilterOptions } from "@shared/schema";
import { Button } from "@/components/ui/button";

const monthNames = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

const formatDateForDisplay = (dateStr: string): string => {
  const [day, month, year] = dateStr.split('/');
  const monthIndex = parseInt(month) - 1;
  return `${monthNames[monthIndex]} ${year}`;
};

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

interface CompactFilterBarProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableDates: string[];
  isLoading: boolean;
}

export function CompactFilterBar({ filters, onFiltersChange, availableDates, isLoading }: CompactFilterBarProps) {
  const updateFilter = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    
    // Reset date filters when period changes
    if (key === 'period') {
      newFilters.startDate = '';
      newFilters.endDate = '';
    }
    
    onFiltersChange(newFilters);
  };

  const availableMonthYears = getUniqueMonthYears(availableDates);
  
  // Set default dates if not set and data is available
  if (availableMonthYears.length > 0) {
    if (!filters.startDate && !filters.endDate) {
      const firstMonthYear = availableMonthYears[0];
      const lastMonthYear = availableMonthYears[availableMonthYears.length - 1];
      
      // Find first and last dates
      const [firstMonth, firstYear] = firstMonthYear.split('/');
      const [lastMonth, lastYear] = lastMonthYear.split('/');
      
      const firstDatesInMonth = availableDates.filter(date => {
        const [day, dateMonth, dateYear] = date.split('/');
        return dateMonth === firstMonth && dateYear === firstYear;
      });
      
      const lastDatesInMonth = availableDates.filter(date => {
        const [day, dateMonth, dateYear] = date.split('/');
        return dateMonth === lastMonth && dateYear === lastYear;
      });
      
      if (firstDatesInMonth.length > 0 && lastDatesInMonth.length > 0) {
        const firstDate = firstDatesInMonth[0];
        const lastDate = lastDatesInMonth[lastDatesInMonth.length - 1];
        
        setTimeout(() => {
          onFiltersChange({
            ...filters,
            startDate: firstDate,
            endDate: lastDate
          });
        }, 0);
      }
    }
  }

  const togglePeriod = (period: 'consolidato' | 'forecast') => {
    const currentPeriods = filters.period;
    let newPeriods: ('consolidato' | 'forecast')[];
    
    if (currentPeriods.includes(period)) {
      // If it's already selected, remove it (but keep at least one)
      newPeriods = currentPeriods.filter(p => p !== period);
      if (newPeriods.length === 0) {
        // Don't allow removing all periods, keep the clicked one
        newPeriods = [period];
      }
    } else {
      // Add the period to selection
      newPeriods = [...currentPeriods, period];
    }
    
    updateFilter('period', newPeriods);
  };

  const handleMonthYearChange = (key: 'startDate' | 'endDate', monthYear: string) => {
    if (!monthYear) {
      updateFilter(key, '');
      return;
    }

    // Find the first date of the selected month/year for startDate, last date for endDate
    const [month, year] = monthYear.split('/');
    const datesInMonth = availableDates.filter(date => {
      const [day, dateMonth, dateYear] = date.split('/');
      return dateMonth === month && dateYear === year;
    });

    if (datesInMonth.length > 0) {
      const selectedDate = key === 'startDate' ? datesInMonth[0] : datesInMonth[datesInMonth.length - 1];
      updateFilter(key, selectedDate);
    }
  };

  return (
    <div className="bg-surface rounded-xl p-6 mb-8 border border-gray-800 shadow-lg">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
        {/* Period Filter */}
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-300 w-18 flex-shrink-0">Periodo:</label>
          <div className="flex gap-1 bg-black rounded-lg p-1 border border-gray-700 shadow-sm flex-1">
            <Button
              variant="ghost"
              size="sm"
              className={`filter-button px-3 py-2 text-xs font-medium rounded-md flex-1 ${
                filters.period.includes('consolidato') ? 'active' : ''
              }`}
              onClick={() => togglePeriod('consolidato')}
              disabled={isLoading}
            >
              Consolidato
            </Button>
            <div className="w-px bg-gray-600 my-1"></div>
            <Button
              variant="ghost"
              size="sm"
              className={`filter-button px-3 py-2 text-xs font-medium rounded-md flex-1 ${
                filters.period.includes('forecast') ? 'active' : ''
              }`}
              onClick={() => togglePeriod('forecast')}
              disabled={isLoading}
            >
              Forecast
            </Button>
          </div>
        </div>

        {/* Type Filter */}
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-300 w-20 flex-shrink-0">Commodity:</label>
          <div className="flex bg-black rounded-lg p-1 border border-gray-700 shadow-sm flex-1">
            <Button
              variant="ghost"
              size="sm"
              className={`filter-button px-3 py-2 text-xs font-medium rounded-md flex-1 ${
                filters.type === 'gas' ? 'active' : ''
              }`}
              onClick={() => updateFilter('type', 'gas')}
              disabled={isLoading}
            >
              <Flame className="h-3 w-3 mr-1" />
              Gas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`filter-button px-3 py-2 text-xs font-medium rounded-md flex-1 ${
                filters.type === 'power' ? 'active' : ''
              }`}
              onClick={() => updateFilter('type', 'power')}
              disabled={isLoading}
            >
              <Zap className="h-3 w-3 mr-1" />
              Power
            </Button>
          </div>
        </div>

        {/* Start Date Filter */}
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-300 w-8 flex-shrink-0">Da:</label>
          <select 
            value={filters.startDate ? `${filters.startDate.split('/')[1]}/${filters.startDate.split('/')[2]}` : availableMonthYears[0] || ""} 
            onChange={(e) => handleMonthYearChange('startDate', e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all duration-200 shadow-sm custom-scrollbar"
          >
            {availableMonthYears.map((monthYear) => (
              <option key={monthYear} value={monthYear} className="bg-black text-white">
                {formatDateForDisplay(`01/${monthYear}`)}
              </option>
            ))}
          </select>
        </div>

        {/* End Date Filter */}
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-300 w-6 flex-shrink-0">A:</label>
          <select 
            value={filters.endDate ? `${filters.endDate.split('/')[1]}/${filters.endDate.split('/')[2]}` : availableMonthYears[availableMonthYears.length - 1] || ""} 
            onChange={(e) => handleMonthYearChange('endDate', e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all duration-200 shadow-sm custom-scrollbar"
          >
            {availableMonthYears.map((monthYear) => (
              <option key={monthYear} value={monthYear} className="bg-black text-white">
                {formatDateForDisplay(`01/${monthYear}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
