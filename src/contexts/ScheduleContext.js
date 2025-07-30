import { createContext, useContext, useState } from 'react';

export const ScheduleContext = createContext();

export const ScheduleProvider = ({ children }) => {
  const [refreshSchedulesCounter, setRefreshSchedulesCounter] = useState(0);
  const triggerRefresh = () => setRefreshSchedulesCounter(prev => prev + 1);

  return (
    <ScheduleContext.Provider value={{ refreshSchedulesCounter, triggerRefresh }}>
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = () => useContext(ScheduleContext);