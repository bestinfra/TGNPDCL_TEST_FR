import { useState, useEffect, useMemo, useCallback, lazy, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
const Page = lazy(() => import('SuperAdmin/Page'));
import { FILTER_STYLES } from '@/contexts/FilterStyleContext';
import BACKEND_URL from '../config';
import { formatDateTime } from '@/utils/dateFormat';
import { apiClient } from '@/api/apiUtils';
import { getStoredUser } from '@/api/subAppAuth';
import {
  mapApiRowToDtrStatsTableRow,
  mapDtrApiFeederToFeedersTableRow,
} from '@/utils/dtrStatsTable';

const HIERARCHY_FORM_LEVELS = [
  { key: 'discom', levelName: 'DISCOM', label: 'DISCOM' },
  { key: 'circle', levelName: 'Circle', label: 'Circle' },
  { key: 'division', levelName: 'Division', label: 'Division' },
  { key: 'subDivision', levelName: 'Sub division', label: 'Sub-Division' },
  { key: 'section', levelName: 'Section', label: 'Section' },
  { key: 'substation', levelName: 'Substation', label: 'Substation' },
] as const;

const HIERARCHY_TYPE_TO_KEY: Record<string, string> = {
  DISCOM: 'discom',
  Circle: 'circle',
  Division: 'division',
  'Sub-Division': 'subDivision',
  Section: 'section',
  Substation: 'substation',
};

const normalizeLevelName = (name: string) => name.toLowerCase().replace(/[\s-]/g, '');

/** Who can see Update Capacity / Update Hierarchy (temporary: TGNPDCL_Admin login). */
const isSupportUser = (): boolean => {
  const user = getStoredUser();
  if (!user) return false;

  const role = String(user?.role ?? '').toUpperCase();
  const accessLevel = String(user?.accessLevel ?? '').toUpperCase();
  const username = String(user?.username ?? '').toUpperCase();

  if (role === 'SUPPORT' || accessLevel === 'SUPPORT') return true;

  // Temporary: allow TGNPDCL_Admin login used for testing
  if (username === 'TGNPDCL_ADMIN') return true;

  const roles = Array.isArray(user?.roles)
    ? user.roles.map((r: string) => String(r).toUpperCase())
    : [];
  if (roles.includes('TGNPDCL_ADMIN')) return true;

  return false;
};

type CapacityUpdateModalProps = {
  isOpen: boolean;
  initialCapacity: string;
  isUpdating: boolean;
  onClose: () => void;
  onConfirm: (capacity: number) => void;
};

/** Local modal ? avoids federated form submit navigating to GET /api/dtrs/capacity */
function CapacityUpdateModal({
  isOpen,
  initialCapacity,
  isUpdating,
  onClose,
  onConfirm,
}: CapacityUpdateModalProps) {
  const [draft, setDraft] = useState(initialCapacity);

  useEffect(() => {
    if (isOpen) {
      setDraft(initialCapacity);
    }
  }, [isOpen, initialCapacity]);

  if (!isOpen) return null;

  const handleUpdateClick = () => {
    const capacity = Number(draft);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      window.alert('Please enter a valid capacity value.');
      return;
    }
    onConfirm(capacity);
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleUpdateClick();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={isUpdating ? undefined : onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-3xl border border-primary-border bg-white p-6 shadow-lg dark:border-dark-border dark:bg-primary-dark-light"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-capacity-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="update-capacity-title"
            className="text-lg font-bold text-primary dark:text-white"
          >
            Update Capacity
          </h2>
          <button
            type="button"
            className="text-secondary hover:text-primary dark:text-subinfo"
            onClick={onClose}
            disabled={isUpdating}
            aria-label="Close"
          >
            ?
          </button>
        </div>

        <form onSubmit={handleFormSubmit} noValidate>
          <label
            htmlFor="capacityKvaInput"
            className="mb-2 block text-sm font-medium text-primary dark:text-white"
          >
            Capacity (kVA)
          </label>
          <input
            id="capacityKvaInput"
            type="number"
            min={1}
            step="any"
            className="w-full rounded-2xl border border-primary-border bg-background-secondary px-4 py-3 text-sm font-medium text-primary outline-none focus:border-primary dark:border-dark-border dark:bg-white/5 dark:text-white"
            placeholder="Enter capacity in kVA"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isUpdating}
            autoFocus
          />

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              className="rounded-full border border-primary-border px-5 py-2.5 text-sm font-medium text-primary dark:border-dark-border dark:text-white"
              onClick={onClose}
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-full bg-secondary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              onClick={handleUpdateClick}
              disabled={isUpdating}
            >
              {isUpdating ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Dummy data for fallback
const dummyDTRData = {
  name: '0',
  dtrNo: '0',
  meterNo: '',
  meterNumber: '',
  division: '0',
  subDivision: '0',
  substation: '0',
  feeder: '0',
  feederNo: '0',
  condition: '0',
  capacity: '0',
  address: '0',
  location: { lat: 0, lng: 0 },
  lastCommunication: null,
  stats: [
    {
      title: 'Total LT Feeders',
      value: '0',
      icon: 'icons/feeder.svg',
      subtitle1: 'Connected to DTR',
      valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
    },
    {
      title: 'Total kW',
      value: '0',
      icon: 'icons/energy.svg',
      subtitle1: 'Active Power',
      valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
    },
    {
      title: 'Total kVA',
      value: '0',
      icon: 'icons/energy.svg',
      subtitle1: 'Apparent Power',
      valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
    },
    {
      title: 'Total kWh',
      value: '0',
      icon: 'icons/energy.svg',
      subtitle1: 'Cumulative Active Energy',
      valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
    },
    {
      title: 'Total kVAh',
      value: '0',
      icon: 'icons/energy.svg',
      subtitle1: 'Cumulative Apparent Energy',
      valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
    },
    {
      title: 'LT Feeders Fuse Blown',
      value: '0',
      icon: 'icons/power_failure.svg',
      subtitle1: 'Requires maintenance',
      valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
    },
    {
      title: 'Unbalanced LT Feeders',
      value: '0',
      icon: 'icons/power_failure.svg',
      subtitle1: 'Requires attention',
      valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
    },
    {
      title: 'Power On',
      value: '0',
      icon: 'icons/power_failure.svg',
      subtitle1: '',
      valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
    },
    {
      title: 'Power Off',
      value: '0',
      icon: 'icons/power_failure.svg',
      subtitle1: '',
      valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
      bg: 'bg-[var(--color-danger)]',
      iconStyle: FILTER_STYLES.WHITE,
    },
    {
      title: 'Status',
      value: '0',
      icon: 'icons/status.svg',
      subtitle1: '0',
      valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
      bg: 'bg-[var(--color-secondary)]',
      iconStyle: FILTER_STYLES.WHITE,
    },
  ],
};

const dummyDailyConsumptionData = {
  xAxisData: ['N/A'],
  seriesData: [
    {
      name: 'Consumption',
      data: [0],
    },
  ],
  totalKwh: 0,
  totalKvah: 0,
  totalKvarh: 0,
};

const dummyAlertsData = [
  {
    alertId: 'NA',
    type: 'N/A',
    feederName: 'NA',
    occuredOn: 'NA',
  },
];

type DtrDetailNavState = {
  division?: string;
  subDivision?: string;
  meterNo?: string;
  meterNumber?: string;
};

const DTRDetailPage = () => {
  const { dtrId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const rowNavState = location.state as DtrDetailNavState | null;

  // kVARh = ?(kVAh? - kWh?)
  const calculateKvarh = (kvah: number, kwh: number): number => {
    const kvarhSquared = Math.pow(kvah, 2) - Math.pow(kwh, 2);
    const calculatedKvarh = kvarhSquared > 0 ? Math.sqrt(kvarhSquared) : 0;
    return calculatedKvarh;
  };

  const [dtr, setDtr] = useState(dummyDTRData);
  const [dailyConsumptionData, setDailyConsumptionData] = useState(dummyDailyConsumptionData);
  const [dtrConsumptionData, setDtrConsumptionData] = useState<any>({
    daily: { totalKwh: 0, totalKvah: 0, totalKvarh: 0 },
    monthly: { totalKwh: 0, totalKvah: 0, totalKvarh: 0 },
  });
  const [selectedTimeRange, setSelectedTimeRange] = useState<'Daily' | 'Monthly'>('Daily');
  const [feedersData, setFeedersData] = useState<
    ReturnType<typeof mapDtrApiFeederToFeedersTableRow>[]
  >([]);
  const [alertsData, setAlertsData] = useState(dummyAlertsData);
  const [alertsPagination, setAlertsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [locationHierarchy, setLocationHierarchy] = useState<any[]>([]);

  const [_isDtrLoading, setIsDtrLoading] = useState(true);
  const [_isConsumptionLoading, setIsConsumptionLoading] = useState(true);
  const [isFeedersLoading, setIsFeedersLoading] = useState(true);

  useEffect(() => {
    if (isFeedersLoading) return;
    console.log('Rendered Feeders:', feedersData);
  }, [feedersData, isFeedersLoading]);

  const [isAlertsLoading, setIsAlertsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isKvaMetricsLoading, setIsKvaMetricsLoading] = useState(false);
  const [stats, setStats] = useState(dummyDTRData.stats);
  const [kvaMetricsData, setKvaMetricsData] = useState<any>({
    dailyData: { xAxisData: [], sums: [] },
    monthlyData: { xAxisData: [], sums: [] },
    capacityInfo: { dtrCapacity: 0, feederCapacity: 0, feederCount: 0 },
    highestKVA: { daily: null, monthly: null },
    thresholdValue: 0,
    overloadThreshold: 0,
    underloadThreshold: 0,
  });
  const [capacityUsage, setCapacityUsage] = useState({
    daily: 0,
    dailyMdkva: 0,
    dailyLastCommDate: '',
    monthly: 0,
    monthlyMdkva: 0,
    monthlyLastCommDate: '',
    yearly: 0,
    yearlyMdkva: 0,
    yearlyLastCommDate: '',
    lifeTime: 0,
    lifeTimeMdkva: 0,
    lifeTimeLastCommDate: '',
    instantly: 0,
    instantKVA: 0,
    instantLastCommDate: '',
  });
  const [kvaTimeRange, setKvaTimeRange] = useState<'Daily' | 'Monthly'>('Daily');
  const [errorMessages, setErrors] = useState<any[]>([]);
  const [dtrStatusValue, setDtrStatusValue] = useState<string>('na');
  const isDtrDropdownDisabled = false;
  const dtrStatusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>('');
  const [previousStatus, setPreviousStatus] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const showSupportActions = isSupportUser();
  const [dataRefreshKey, setDataRefreshKey] = useState(0);

  const [isCapacityModalOpen, setIsCapacityModalOpen] = useState(false);
  const [capacityModalInitial, setCapacityModalInitial] = useState('');
  const [isUpdatingCapacity, setIsUpdatingCapacity] = useState(false);

  const [isHierarchyModalOpen, setIsHierarchyModalOpen] = useState(false);
  const [isUpdatingHierarchy, setIsUpdatingHierarchy] = useState(false);
  const [isHierarchyOptionsLoading, setIsHierarchyOptionsLoading] = useState(false);
  const [hierarchyValues, setHierarchyValues] = useState<Record<string, string>>({});
  const [hierarchyOptions, setHierarchyOptions] = useState<
    Record<string, { value: string; label: string }[]>
  >({});

  const getNumericDtrId = useCallback(() => {
    const trimmed = dtrId?.trim();
    if (!trimmed) {
      return null;
    }
    return trimmed;
  }, [dtrId]);

  const buildHierarchyOptionsFromData = useCallback((apiData: any[]) => {
    const next: Record<string, { value: string; label: string }[]> = {};
    HIERARCHY_FORM_LEVELS.forEach((level) => {
      const normalizedTarget = normalizeLevelName(level.levelName);
      next[level.key] = apiData
        .filter(
          (item: any) =>
            normalizeLevelName(String(item.levelName ?? '')) === normalizedTarget,
        )
        .map((item: any) => ({
          value: item.id.toString(),
          label: item.name,
        }));
    });
    return next;
  }, []);

  const resolveHierarchyLocationId = (values: Record<string, string>) => {
    const keys = ['substation', 'section', 'subDivision', 'division', 'circle', 'discom'] as const;
    for (const key of keys) {
      const v = values[key];
      if (v) return v;
    }
    return '';
  };

  const handleOpenCapacityModal = () => {
    const raw = dtr.capacity;
    const initial = raw && raw !== 'N/A' && raw !== '0' ? String(raw) : '';
    setCapacityModalInitial(initial);
    setIsCapacityModalOpen(true);
  };

  const handleCloseCapacityModal = () => {
    if (isUpdatingCapacity) return;
    setIsCapacityModalOpen(false);
  };

  const handleCapacityUpdate = useCallback(
    async (capacityValue: number) => {
    const numericDtrId = getNumericDtrId();
    if (!numericDtrId) {
      window.alert('Invalid DTR ID');
      return;
    }

    setIsUpdatingCapacity(true);
    try {
      const data = await apiClient.put('/dtrs/capacity', {
        dtrId: Number(numericDtrId),
        capacity: capacityValue,
      });
      if (data?.success) {
        window.alert(data.message || 'DTR capacity updated successfully');
        setDtr((prev) => ({ ...prev, capacity: String(capacityValue) }));
        setDataRefreshKey((k) => k + 1);
        setIsCapacityModalOpen(false);
      } else {
        window.alert(data?.message || 'Failed to update DTR capacity');
      }
    } catch (error) {
      console.error('Error updating DTR capacity:', error);
      window.alert(
        error instanceof Error ? error.message : 'Failed to update DTR capacity. Please try again.',
      );
    } finally {
      setIsUpdatingCapacity(false);
    }
    },
    [getNumericDtrId],
  );

  const loadChildHierarchyOptions = async (
    parentFilterKey: string,
    parentValue: string,
  ) => {
    const parentIndex = HIERARCHY_FORM_LEVELS.findIndex((l) => l.key === parentFilterKey);
    if (parentIndex < 0 || parentIndex >= HIERARCHY_FORM_LEVELS.length - 1) return;

    const childLevel = HIERARCHY_FORM_LEVELS[parentIndex + 1];
    const params = new URLSearchParams();
    params.append('parentId', parentValue);
    const data = await apiClient.get(`/dtrs/filter/filter-options?${params.toString()}`);
    if (!data?.success) return;

    const childOptions = (data.data || []).map((item: any) => ({
      value: item.id.toString(),
      label: item.name,
    }));

    setHierarchyOptions((prev) => {
      const next = { ...prev, [childLevel.key]: childOptions };
      for (let i = parentIndex + 2; i < HIERARCHY_FORM_LEVELS.length; i++) {
        next[HIERARCHY_FORM_LEVELS[i].key] = [];
      }
      return next;
    });

    setHierarchyValues((prev) => {
      const next = { ...prev, [parentFilterKey]: parentValue };
      for (let i = parentIndex + 1; i < HIERARCHY_FORM_LEVELS.length; i++) {
        next[HIERARCHY_FORM_LEVELS[i].key] = '';
      }
      return next;
    });
  };

  const handleHierarchyLevelChange = async (filterKey: string, value: string) => {
    setHierarchyValues((prev) => ({ ...prev, [filterKey]: value }));

    const levelIndex = HIERARCHY_FORM_LEVELS.findIndex((l) => l.key === filterKey);
    if (levelIndex < 0) return;

    const cleared: Record<string, string> = { [filterKey]: value };
    for (let i = levelIndex + 1; i < HIERARCHY_FORM_LEVELS.length; i++) {
      cleared[HIERARCHY_FORM_LEVELS[i].key] = '';
    }
    setHierarchyValues((prev) => ({ ...prev, ...cleared }));

    setHierarchyOptions((prev) => {
      const next = { ...prev };
      for (let i = levelIndex + 1; i < HIERARCHY_FORM_LEVELS.length; i++) {
        next[HIERARCHY_FORM_LEVELS[i].key] = [];
      }
      return next;
    });

    if (!value) return;
    await loadChildHierarchyOptions(filterKey, value);
  };

  const handleOpenHierarchyModal = async () => {
    setIsHierarchyModalOpen(true);
    setIsHierarchyOptionsLoading(true);
    try {
      const data = await apiClient.get('/dtrs/filter/filter-options');
      if (!data?.success) {
        throw new Error(data?.message || 'Failed to load hierarchy options');
      }
      const apiData = data.data || [];
      setHierarchyOptions(buildHierarchyOptionsFromData(apiData));

      const initialValues: Record<string, string> = {};
      locationHierarchy.forEach((loc: any) => {
        const key = HIERARCHY_TYPE_TO_KEY[loc.type];
        if (key && loc.id != null) {
          initialValues[key] = String(loc.id);
        }
      });
      setHierarchyValues(initialValues);
    } catch (error) {
      console.error('Error loading hierarchy options:', error);
      window.alert(
        error instanceof Error
          ? error.message
          : 'Failed to load hierarchy options. Please try again.',
      );
      setIsHierarchyModalOpen(false);
    } finally {
      setIsHierarchyOptionsLoading(false);
    }
  };

  const handleCloseHierarchyModal = () => {
    if (isUpdatingHierarchy) return;
    setIsHierarchyModalOpen(false);
  };

  const handleConfirmHierarchyUpdate = async () => {
    const numericDtrId = getNumericDtrId();
    if (!numericDtrId) {
      window.alert('Invalid DTR ID');
      return;
    }

    const locationId = resolveHierarchyLocationId(hierarchyValues);
    if (!locationId) {
      window.alert('Please select a hierarchy location (at least Substation).');
      return;
    }

    setIsUpdatingHierarchy(true);
    try {
      const data = await apiClient.put(`/dtrs/hierarchy?dtrId=${numericDtrId}`, {
        locationId: Number(locationId),
      });
      if (data?.success) {
        window.alert(data.message || 'DTR hierarchy updated successfully');
        setDataRefreshKey((k) => k + 1);
        setIsHierarchyModalOpen(false);
      } else {
        window.alert(data?.message || 'Failed to update DTR hierarchy');
      }
    } catch (error) {
      console.error('Error updating DTR hierarchy:', error);
      window.alert(
        error instanceof Error
          ? error.message
          : 'Failed to update DTR hierarchy. Please try again.',
      );
    } finally {
      setIsUpdatingHierarchy(false);
    }
  };

  const hierarchyFormFields = useMemo(
    () =>
      HIERARCHY_FORM_LEVELS.map((level) => ({
        type: 'dropdown' as const,
        label: level.label,
        name: level.key,
        searchable: false,
        value: hierarchyValues[level.key] || '',
        required: level.key === 'substation',
        options: hierarchyOptions[level.key] || [],
        onChange: (value: string) => {
          void handleHierarchyLevelChange(level.key, value);
        },
        disabled: isHierarchyOptionsLoading,
      })),
    [hierarchyOptions, hierarchyValues, isHierarchyOptionsLoading],
  );

  const handleDtrStatusChange = (value: string) => {
    if (value === 'na') {
      setDtrStatusValue(value);
      return;
    }
    setPreviousStatus(dtrStatusValue);
    setDtrStatusValue(value);
    setPendingStatus(value);
    
    setDtr((prev) => ({
      ...prev,
      condition: value.toUpperCase(),
    }));
    
    setIsStatusModalOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    setIsUpdatingStatus(true);

    try {
      const numericDtrId = getNumericDtrId();
      if (!numericDtrId) {
        throw new Error('Invalid DTR ID format');
      }

      const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          status: pendingStatus,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        const apiStatus = data.data.status;
        const normalizedStatus = apiStatus ? apiStatus.toLowerCase() : pendingStatus;

        setDtr((prev) => ({
          ...prev,
          condition: apiStatus || pendingStatus.toUpperCase(),
        }));

        setDtrStatusValue(normalizedStatus);
        setPreviousStatus('');
      } else {
        console.error('Failed to update DTR status:', data.message);
        setDtrStatusValue(previousStatus);
        setDtr((prev) => ({
          ...prev,
          condition: previousStatus.toUpperCase(),
        }));
      }
    } catch (error) {
      console.error('Error updating DTR status:', error);
      setDtrStatusValue(previousStatus);
      setDtr((prev) => ({
        ...prev,
        condition: previousStatus.toUpperCase(),
      }));
    } finally {
      setIsUpdatingStatus(false);
      setIsStatusModalOpen(false);
      setPendingStatus('');
    }
  };

  const handleCancelStatusChange = () => {
    setDtrStatusValue(previousStatus);
    
    setDtr((prev) => ({
      ...prev,
      condition: previousStatus.toUpperCase(),
    }));
    
    setIsStatusModalOpen(false);
    setPendingStatus('');
    setPreviousStatus('');
  };

  // Get KVA metrics data based on selected time range
  const getKvaMetricsData = () => {
    if (kvaTimeRange === 'Daily') {
      if (kvaMetricsData && kvaMetricsData.dailyData) {
        const data = {
          xAxisData: kvaMetricsData.dailyData.xAxisData || [],
          seriesData: [
            {
              name: 'kVA',
              data: kvaMetricsData.dailyData.sums?.map((sum: string) => parseFloat(sum)) || [],
            },
          ],
        };
        return data;
      }
    } else if (kvaTimeRange === 'Monthly') {
      if (kvaMetricsData && kvaMetricsData.monthlyData) {
        const data = {
          xAxisData: kvaMetricsData.monthlyData.xAxisData || [],
          seriesData: [
            {
              name: 'kVA',
              data: kvaMetricsData.monthlyData.sums?.map((sum: string) => parseFloat(sum)) || [],
            },
          ],
        };
        return data;
      }
    }

    return {
      xAxisData: [],
      seriesData: [{ name: 'kVA', data: [] }],
    };
  };

  // Clear all error messages
  const clearErrors = () => {
    setErrors([]);
  };

  // Remove a specific error message
  const removeError = (indexToRemove: number) => {
    setErrors((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // Retry all APIs
  const retryAllAPIs = () => {
    clearErrors();
    window.location.reload();
  };

  // Fetch Alerts data (reusable across initial load and pagination changes)
  const fetchAlertsData = async (pageOverride?: number, limitOverride?: number) => {
    setIsAlertsLoading(true);
    try {
      const numericDtrId = getNumericDtrId();
      if (!numericDtrId) {
        throw new Error('Invalid DTR ID format');
      }

      const params = new URLSearchParams();
      const pageToUse = pageOverride ?? alertsPagination.currentPage;
      const limitToUse = limitOverride ?? alertsPagination.limit;
      params.append('page', String(pageToUse));
      params.append('pageSize', String(limitToUse));

      console.log('?? [DTRDetailPage] Fetching alerts with:', {
        pageToUse,
        limitToUse,
        pageOverride,
        limitOverride,
      });

      const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/alerts?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch alerts data');

      const data = await response.json();
      console.log(data);

      if (data.success) {
        const transformedAlerts =
          data.data?.map((alert: any) => {
            // Use the sNo directly from backend - it's already calculated correctly
            return {
              ...alert,
              feederName: alert.feederName || 'N/A',
              // Keep the sNo from backend as-is
            };
          }) || [];

        setAlertsData(transformedAlerts);
        if (data.pagination) {
          setAlertsPagination({
            currentPage: data.pagination.currentPage ?? pageToUse,
            totalPages: data.pagination.totalPages ?? alertsPagination.totalPages,
            totalCount: data.pagination.totalCount ?? alertsPagination.totalCount,
            limit: data.pagination.limit ?? limitToUse,
            hasNextPage: data.pagination.hasNextPage ?? alertsPagination.hasNextPage,
            hasPrevPage: data.pagination.hasPrevPage ?? alertsPagination.hasPrevPage,
          });
        }
      } else {
        throw new Error(data.message || 'Failed to fetch alerts data');
      }
    } catch (error) {
      console.error('Error fetching alerts data:', error);
      setAlertsData(dummyAlertsData);
      setErrors((prev) => {
        if (!prev.includes('Failed to fetch alerts data')) {
          const updated = [...prev, 'Failed to fetch alerts data'];
          return updated;
        }
        return prev;
      });
    } finally {
      setTimeout(() => {
        setIsAlertsLoading(false);
      }, 1000);
    }
  };

  useEffect(() => {
    if (locationHierarchy.length > 0) {
      const feederLocation = locationHierarchy.find((loc: any) => loc.type === 'Feeder');
      if (feederLocation) {
        setDtr((prev) => ({
          ...prev,
          address: feederLocation.name || 'N/A',
        }));
      }
    }
  }, [locationHierarchy]);

  useEffect(() => {
    if (dtr.condition && dtr.condition !== 'N/A' && dtr.condition !== '0') {
      const condition = dtr.condition.toLowerCase();
      let statusValue = 'active';

      if (
        condition.includes('inactive') ||
        condition.includes('off') ||
        condition.includes('disabled')
      ) {
        statusValue = 'inactive';
      } else if (
        condition.includes('active') ||
        condition.includes('on') ||
        condition.includes('enabled')
      ) {
        statusValue = 'active';
      }

      setDtrStatusValue(statusValue);
    } else {
      setDtrStatusValue('na');
    }
  }, [dtr.condition]);

  useEffect(() => {
    const fetchDtrData = async () => {
      setIsDtrLoading(true);
      try {
        const numericDtrId = getNumericDtrId();
        if (!numericDtrId) {
          throw new Error('Invalid DTR ID format');
        }

        const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}`);
        if (!response.ok) throw new Error('Failed to fetch DTR data');

        const data = await response.json();
        const dtrData = data.data?.dtr;

        if (!dtrData) {
          throw new Error(data.message || 'Failed to fetch DTR data');
        }

        const detailPayload = data.data ?? {};
        const mappedDetail = mapApiRowToDtrStatsTableRow(
          {
            ...(typeof detailPayload.dtr === 'object' && detailPayload.dtr
              ? detailPayload.dtr
              : {}),
            ...detailPayload,
            ...(rowNavState ?? {}),
            meterNo: rowNavState?.meterNo ?? rowNavState?.meterNumber,
            meterNumber: rowNavState?.meterNumber ?? rowNavState?.meterNo,
          },
          1,
        );
        const detailMeter = mappedDetail.meterNumber;

        setDtr({
          name: dtrData.serialNumber,
          dtrNo: dtrData.dtrNumber,
          meterNo: detailMeter ? String(detailMeter) : '',
          meterNumber: detailMeter ? String(detailMeter) : '',
          division: mappedDetail.division ? String(mappedDetail.division) : 'N/A',
          subDivision: mappedDetail.subDivision
            ? String(mappedDetail.subDivision)
            : 'N/A',
          substation: 'N/A',
          feeder: 'N/A',
          feederNo: 'N/A',
          condition: dtrData.status,
          capacity: dtrData.capacity,
          address:
            data.data?.feeders?.[0]?.location?.name || data.data?.feeders?.[0]?.city,
          location: {
            lat: data.data?.feeders?.[0]?.latitude ?? 0,
            lng: data.data?.feeders?.[0]?.longitude ?? 0,
          },
          lastCommunication: dtrData.lastCommunication ?? null,
          stats: dtr.stats,
        });
      } catch (error) {
        console.error('Error fetching DTR data:', error);
        setErrors((prev) => {
          if (!prev.includes('Failed to fetch DTR data')) {
            const updated = [...prev, 'Failed to fetch DTR data'];
            return updated;
          }
          return prev;
        });
      } finally {
        setTimeout(() => {
          setIsDtrLoading(false);
        }, 1000);
      }
    };

    const fetchConsumptionData = async () => {
      setIsConsumptionLoading(true);
      try {
        const numericDtrId = getNumericDtrId();
        if (!numericDtrId) {
          throw new Error('Invalid DTR ID format');
        }

        const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/consumptionAnalytics`);
        if (!response.ok) throw new Error('Failed to fetch consumption data');

        const data = await response.json();

        if (data.status === 'success') {
          const transformedConsumptionData = {
            xAxisData: data.data?.dailyData?.xAxisData || [],
            seriesData: [
              {
                name: 'Consumption',
                data: data.data?.dailyData?.sums?.map((sum: string) => parseFloat(sum)) || [],
              },
            ],
            totalKwh: data.data?.dailyData?.totalKwh || 0,
            totalKvah: data.data?.dailyData?.totalKvah || 0,
            totalKvarh: data.data?.dailyData?.totalKvarh || 0,
          };

          setDailyConsumptionData(transformedConsumptionData);

          // Store consumption data for RightAngle component
          setDtrConsumptionData({
            daily: {
              totalKwh: data.data?.dailyData?.totalKwh || 0,
              totalKvah: data.data?.dailyData?.totalKvah || 0,
              totalKvarh: data.data?.dailyData?.totalKvarh || 0,
            },
            monthly: {
              totalKwh: data.data?.monthlyData?.totalKwh || 0,
              totalKvah: data.data?.monthlyData?.totalKvah || 0,
              totalKvarh: data.data?.monthlyData?.totalKvarh || 0,
            },
          });

          console.log('?? [DTR Consumption] Daily Data:', {
            totalKwh: data.data?.dailyData?.totalKwh,
            totalKvah: data.data?.dailyData?.totalKvah,
            totalKvarh: data.data?.dailyData?.totalKvarh,
          });
          console.log('?? [DTR Consumption] Monthly Data:', {
            totalKwh: data.data?.monthlyData?.totalKwh,
            totalKvah: data.data?.monthlyData?.totalKvah,
            totalKvarh: data.data?.monthlyData?.totalKvarh,
          });
          console.log('?? [RightAngle] Data for component:', dtrConsumptionData);
        } else {
          throw new Error(data.message || 'Failed to fetch consumption data');
        }
      } catch (error) {
        console.error('Error fetching consumption data:', error);
        setDailyConsumptionData(dummyDailyConsumptionData);
        setErrors((prev) => {
          if (!prev.includes('Failed to fetch consumption data')) {
            const updated = [...prev, 'Failed to fetch consumption data'];
            return updated;
          }
          return prev;
        });
      } finally {
        setTimeout(() => {
          setIsConsumptionLoading(false);
        }, 1000);
      }
    };

    const fetchFeedersData = async () => {
      setIsFeedersLoading(true);
      try {
        // Extract numeric DTR ID from the URL parameter
        const numericDtrId = getNumericDtrId();
        if (!numericDtrId) {
          throw new Error('Invalid DTR ID format');
        }

        const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}`);
        if (!response.ok) throw new Error('Failed to fetch feeders data');

        const data = await response.json();
        const apiResponse = data;
        const feeders = data.data?.feeders ?? [];
        const currentDtrId = numericDtrId;

        console.log('DTR Detail API Response:', apiResponse);
        console.log('Feeders Received:', feeders);
        console.log('Current DTR ID:', currentDtrId);

        if (data.success) {
          const feederRows = feeders.map(
            (feeder: Record<string, unknown>, index: number) =>
              mapDtrApiFeederToFeedersTableRow(feeder, index),
          );
          setFeedersData(feederRows);

          // Set location hierarchy if available
          if (data.data?.locationHierarchy) {
            setLocationHierarchy(data.data.locationHierarchy);

            // Update the address using the Feeder type from location hierarchy
            const feederLocation = data.data.locationHierarchy.find(
              (loc: any) => loc.type === 'Feeder'
            );
            if (feederLocation) {
              setDtr((prev) => {
                const updated = {
                  ...prev,
                  address: feederLocation.name || 'N/A',
                };
                return updated;
              });
            } else {
            }
          } else {
          }
        } else {
          throw new Error(data.message || 'Failed to fetch feeders data');
        }
      } catch (error) {
        console.error('Error fetching feeders data:', error);
        setFeedersData([]);
        setErrors((prev) => {
          if (!prev.includes('Failed to fetch feeders data')) {
            const updated = [...prev, 'Failed to fetch feeders data'];
            return updated;
          }
          return prev;
        });
      } finally {
        setTimeout(() => {
          setIsFeedersLoading(false);
        }, 1000);
      }
    };

    // fetchAlertsData removed here to reuse the hoisted version

    const fetchKVAMetrics = async () => {
      setIsKvaMetricsLoading(true);
      try {
        // Extract numeric DTR ID from the URL parameter
        const numericDtrId = getNumericDtrId();
        if (!numericDtrId) {
          throw new Error('Invalid DTR ID format');
        }

        const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/kvaMetrics`);
        const data = await response.json();

        if (data.status === 'success') {
          // Store the complete KVA metrics data with capacity info
          setKvaMetricsData({
            dailyData: data.data?.dailyData || { xAxisData: [], sums: [] },
            monthlyData: data.data?.monthlyData || { xAxisData: [], sums: [] },
            capacityInfo: data.data?.capacityInfo || {
              dtrCapacity: 0,
              feederCapacity: 0,
              feederCount: 0,
            },
            highestKVA: data.data?.highestKVA || { daily: null, monthly: null },
            thresholdValue: data.data?.thresholdValue || 0,
            overloadThreshold: data.data?.overloadThreshold || 0,
            underloadThreshold: data.data?.underloadThreshold || 0,
          });
        } else {
          throw new Error(data.message || 'Failed to fetch KVA metrics');
        }
      } catch (error: any) {
        console.error('Error fetching KVA metrics:', error);
        setKvaMetricsData({
          dailyData: { xAxisData: [], sums: [] },
          monthlyData: { xAxisData: [], sums: [] },
          capacityInfo: { dtrCapacity: 0, feederCapacity: 0, feederCount: 0 },
          highestKVA: { daily: null, monthly: null },
          thresholdValue: 0,
          overloadThreshold: 0,
          underloadThreshold: 0,
        });
        // setFailedApis((prev) => [
        //   ...prev,
        //   {
        //     id: "kvaMetrics",
        //     name: "KVA Metrics",
        //     retryFunction: fetchKVAMetrics,
        //     errorMessage: error.message || "Failed to fetch KVA metrics",
        //   },
        // ]);
      } finally {
        setIsKvaMetricsLoading(false);
      }
    };

    const fetchFeederStats = async () => {
      setIsStatsLoading(true);
      try {
        // Extract numeric DTR ID from the URL parameter
        const numericDtrId = getNumericDtrId();
        if (!numericDtrId) {
          throw new Error('Invalid DTR ID format');
        }

        const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/feederStats`);
        if (!response.ok) throw new Error('Failed to fetch feeder stats');

        const data = await response.json();
        // console.log(' 000000000000000000', data);

        if (data.success) {
          const updatedStats = [
            {
              title: 'Total LT Feeders',
              value: data.data?.totalLTFeeders || '0',
              icon: 'icons/feeder.svg',
              subtitle1: 'Connected to DTR',
              valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
            },
            {
              title: 'Total kW',
              value:
                data.data?.totalKW !== undefined && data.data?.totalKW !== null
                  ? Number(data.data.totalKW).toFixed(2)
                  : '0',
              icon: 'icons/energy.svg',
              subtitle1: 'Active Power',
              valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
            },
            {
              title: 'Total kVA',
              value: data.data?.totalKVA || '0',
              icon: 'icons/energy.svg',
              subtitle1: 'Apparent Power',
              valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
            },
            {
              title: 'Total kWh',
              value:
                data.data?.totalKWh !== undefined && data.data?.totalKWh !== null
                  ? Number(data.data.totalKWh).toFixed(2)
                  : '0',
              icon: 'icons/energy.svg',
              subtitle1: 'Cumulative Active Energy',
              valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
            },
            {
              title: 'Total kVAh',
              value:
                data.data?.totalKVAh !== undefined && data.data?.totalKVAh !== null
                  ? Number(data.data.totalKVAh).toFixed(2)
                  : '0',
              icon: 'icons/energy.svg',
              subtitle1: 'Cumulative Apparent Energy',
              valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
            },
            {
              title: 'LT Feeders Fuse Blown',
              value: data.data?.ltFuseBlown || '0',
              icon: 'icons/power_failure.svg',
              subtitle1: 'Requires maintenance',
              valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
            },
            {
              title: 'Unbalanced LT Feeders',
              value: data.data?.unbalancedLTFeeders || '0',
              icon: 'icons/power_failure.svg',
              subtitle1: 'Requires attention',
              valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
            },
            {
              title: 'Power On',
              value: data.data?.powerOnHours || '0',
              icon: 'icons/power_failure.svg',
              subtitle1: '',
              valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
            },
            {
              title: 'Power Off',
              value: data.data?.powerOffHours || '0',
              icon: 'icons/power_failure.svg',
              subtitle1: '',
              valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
              bg: 'bg-[var(--color-danger)]',
              iconStyle: FILTER_STYLES.WHITE,
            },
            {
              title: 'Status',
              value: data.data?.status || '0',
              icon: 'icons/status.svg',
              subtitle1: '0',
              valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
              bg: 'bg-[var(--color-secondary)]',
              iconStyle: FILTER_STYLES.WHITE,
            },
          ];

          // console.log('?? [DTR Statistics] Final Stats Array:', updatedStats);

          setStats(updatedStats);

          // Set capacity usage for the gauge
          setCapacityUsage({
            instantly: data.data?.instantCapacityUsage || 0,
            instantKVA: data.data?.instantKVA || 0,
            instantLastCommDate: formatDateTime(data.data?.instantPeakDate),
            daily: data.data?.dailyCapacityUsage || 0,
            dailyMdkva: data.data?.dailyPeakKVA || 0,
            dailyLastCommDate: formatDateTime(data.data?.dailyPeakDate),
            monthly: data.data?.monthlyCapacityUsage || 0,
            monthlyMdkva: data.data?.monthlyPeakKVA || 0,
            monthlyLastCommDate: formatDateTime(data.data?.monthlyPeakDate),
            yearly: data.data?.yearlyCapacityUsage || 0,
            yearlyMdkva: data.data?.yearlyPeakKVA || 0,
            yearlyLastCommDate: formatDateTime(data.data?.yearlyPeakDate),
            lifeTime: data.data?.lifetimeCapacityUsage || 0,
            lifeTimeMdkva: data.data?.lifetimePeakKVA || 0,
            lifeTimeLastCommDate: formatDateTime(data.data?.lifetimePeakDate),
          });
        }
      } catch (error) {
        console.error('Error fetching feeder stats:', error);
        // Don't add to errors since this is supplementary data
      } finally {
        setTimeout(() => {
          setIsStatsLoading(false);
        }, 1000);
      }
    };

    fetchDtrData();
    fetchConsumptionData();
    fetchFeedersData();
    fetchAlertsData();
    fetchFeederStats();
    fetchKVAMetrics();
  }, [dtrId, dataRefreshKey]);

  const handleAlertsPageChange = async (page: number, limit: number) => {
    setAlertsPagination((prev) => ({
      ...prev,
      currentPage: page,
      limit: limit,
    }));
    await fetchAlertsData(page, limit);
  };

  // console.log(dtr, 'dtr');
  const lastComm = dtr.lastCommunication
    ? new Date(dtr.lastCommunication).toLocaleString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    : 'N/A';

  // Handle Excel download for all DTR data in a single file
  const handleExportData = () => {
    // Import XLSX library
    import('xlsx').then((XLSX) => {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Prepare DTR Information data
      const dtrInfoData = [
        {
          'DTR No': dtr.dtrNo,
          'DTR Name': dtr.name,
          Division: locationHierarchy.find((loc) => loc.type === 'Division')?.name || 'N/A',
          'Sub-Division':
            locationHierarchy.find((loc) => loc.type === 'Sub-Division')?.name || 'N/A',
          Substation: locationHierarchy.find((loc) => loc.type === 'Substation')?.name || 'N/A',
          Feeder: locationHierarchy.find((loc) => loc.type === 'Feeder')?.name || 'N/A',
          'Feeder No': locationHierarchy.find((loc) => loc.type === 'Feeder')?.code || 'N/A',
          Rating: '15.00 kVA',
          Condition: dtr.condition,
          Capacity: dtr.capacity,
          Address: dtr.address,
          Latitude: dtr.location.lat !== 0 ? dtr.location.lat.toFixed(6) : 'N/A',
          Longitude: dtr.location.lng !== 0 ? dtr.location.lng.toFixed(6) : 'N/A',
          'Last Communication': lastComm,
        },
      ];

      // Prepare DTR Statistics data with S.No
      const dtrStatsData = stats.map((stat, index) => ({
        'S.No': index + 1,
        Metric: stat.title,

        Value: stat.value || 'N/A',
        Subtitle: stat.subtitle1 || '',
      }));

      // Prepare Feeders data
      const feedersExportData = feedersData.map((feeder, index) => ({
        'S.No': index + 1,
        'Feeder Name': feeder.feederName || 'N/A',
        'Load Status': feeder.loadStatus || 'N/A',
        Condition: feeder.condition || 'N/A',
        Capacity: feeder.capacity || 'N/A',
        Address: feeder.address || 'N/A',
      }));

      // Prepare Alerts data
      const alertsExportData = alertsData.map((alert, index) => ({
        'S.No': index + 1,
        'Alert ID': alert.alertId || 'N/A',
        Type: alert.type || 'N/A',
        'Feeder Name': alert.feederName || 'N/A',
        'Occurred On': alert.occuredOn || 'N/A',
      }));

      // Prepare Daily Consumption data
      const consumptionExportData = dailyConsumptionData.xAxisData.map((date, index) => ({
        'S.No': index + 1,
        Date: date || 'N/A',
        'Consumption (kWh)': dailyConsumptionData.seriesData[0]?.data[index] || 0,
      }));

      // Create sheets with auto-sizing
      const dtrInfoSheet = XLSX.utils.json_to_sheet(dtrInfoData);
      const dtrStatsSheet = XLSX.utils.json_to_sheet(dtrStatsData);
      const feedersSheet = XLSX.utils.json_to_sheet(feedersExportData);
      const alertsSheet = XLSX.utils.json_to_sheet(alertsExportData);
      const consumptionSheet = XLSX.utils.json_to_sheet(consumptionExportData);

      // Auto-size columns for all sheets
      const sheets = [
        { sheet: dtrInfoSheet, name: 'DTR Information' },
        { sheet: dtrStatsSheet, name: 'DTR Statistics' },
        { sheet: feedersSheet, name: 'DTR Feeders' },
        { sheet: alertsSheet, name: 'DTR Alerts' },
        { sheet: consumptionSheet, name: 'Daily Consumption' },
      ];

      sheets.forEach(({ sheet }) => {
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        const cols = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          let maxWidth = 10;
          for (let R = range.s.r; R <= range.e.r; ++R) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = sheet[cellAddress];
            if (cell && cell.v) {
              const cellLength = cell.v.toString().length;
              maxWidth = Math.max(maxWidth, cellLength);
            }
          }
          cols[C] = { width: Math.min(maxWidth + 2, 50) };
        }
        sheet['!cols'] = cols;
      });

      // Add worksheets to workbook
      XLSX.utils.book_append_sheet(workbook, dtrInfoSheet, 'DTR Information');
      XLSX.utils.book_append_sheet(workbook, dtrStatsSheet, 'DTR Statistics');
      XLSX.utils.book_append_sheet(workbook, feedersSheet, 'DTR Feeders');
      XLSX.utils.book_append_sheet(workbook, alertsSheet, 'DTR Alerts');
      XLSX.utils.book_append_sheet(workbook, consumptionSheet, 'Daily Consumption');

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });

      // Create blob and download
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dtr-${dtr.name}-complete-data.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    });
  };

  // Handle feeders export
  const handleFeedersExport = () => {
    // Add feeders export logic here
  };

  // Handle feeder row click
  const handleFeederClick = (feederId: string) => {
    const meterRouteId = (row: (typeof feedersData)[number]) =>
      String(row.serialNumber || row.meterNumber || row.feederName || '');

    // Find the feeder data for the clicked feeder (match display name or meter id)
    const feederData = feedersData.find(
      (feeder) =>
        feeder.feederName === feederId ||
        feeder.serialNumber === feederId ||
        feeder.meterNumber === feederId,
    );
    if (feederData) {
      const routeId = meterRouteId(feederData) || feederId;
      navigate(`/feeder/${routeId}`, {
        state: {
          feederData,
          feederId: routeId,
          id: dtrId,
          dtrId: dtrId,
          dtrName: dtr.name,
        },
      });
    }
  };

  // Handle feeder view action
  const handleFeederView = (row: (typeof feedersData)[number]) => {
    const routeId = row.serialNumber || row.meterNumber || row.feederName;
    navigate(`/feeder/${routeId}`, {
      state: {
        feederData: row,
        feederId: routeId,
        id: dtrId,
        dtrId: dtrId,
        dtrName: dtr.name,
      },
    });
  };
  // console.log('setCapacityUsage', capacityUsage);
  return (
    <div className=" sticky top-0 ">
      <Page
        sections={[
          // Error Section - Above PageHeader
          ...(errorMessages.length > 0
            ? [
                {
                  layout: {
                    type: 'column' as const,
                    gap: 'gap-4',
                    rows: [
                      {
                        layout: 'column' as const,
                        columns: [
                          {
                            name: 'Error',
                            props: {
                              visibleErrors: errorMessages,
                              onRetry: retryAllAPIs,
                              onClose: () => removeError(0), // Remove the top error
                              showRetry: true,
                              maxVisibleErrors: 4, // Show max 4 errors at once
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              ]
            : []),
          {
            layout: {
              type: 'grid' as const,
              columns: 1,
              className: 'w-full',
              rows: [
                {
                  layout: 'row' as const,
                  className: 'w-full',
                  columns: [
                    {
                      name: 'PageHeader',
                      props: {
                        title: 'DTR Details',
                        onBackClick: () => navigate('/'),
                        backButtonText: 'Back to Dashboard',
                        buttons: [
                          ...(showSupportActions
                            ? [
                                {
                                  label: 'Update Capacity',
                                  variant: 'secondary',
                                  onClick: handleOpenCapacityModal,
                                  disabled: isUpdatingCapacity,
                                },
                                {
                                  label: 'Update Hierarchy',
                                  variant: 'secondary',
                                  onClick: () => {
                                    void handleOpenHierarchyModal();
                                  },
                                  disabled:
                                    isUpdatingHierarchy || isHierarchyOptionsLoading,
                                },
                              ]
                            : []),
                          {
                            label: 'Export Data',
                            variant: 'primary',
                            onClick: () => handleExportData(),
                          },
                        ],
                      },
                    },
                  ],
                },
              ],
            },
          },
          {
            layout: {
              type: 'grid' as const,
              columns: 3,
              className:
                'border border-primary-border dark:border-dark-border rounded-3xl bg-white dark:bg-primary-dark-light p-4',
              rows: [
                {
                  layout: 'row' as const,
                  className: 'justify-between w-full',
                  span: { col: 3, row: 1 },
                  columns: [
                    {
                      name: 'SectionHeader',
                      props: {
                        title: 'DTR Information',

                        titleLevel: 2,
                        titleSize: 'lg',
                        titleVariant: '',
                        titleWeight: 'bold',
                        titleAlign: 'left',
                        defaultTitleHeight: '0',
                        className: 'w-full',
                        showDropdown: true,
                        dropdownOptions: dtrStatusOptions,
                        dropdownValue: dtrStatusValue,
                        dropdownPlaceholder: dtrStatusValue === 'na' ? 'N/A' : 'Select Status',
                        dropdownName: 'dtrStatus',
                        onDropdownChange: handleDtrStatusChange,
                        dropdownDisabled: isDtrDropdownDisabled,
                        dropdownClassName: 'w-30',
                        searchable: false,
                        lastSync: true,
                        lastSyncLabel: 'Last Sync',
                        lastSyncValue: '2025-09-16 12:45 PM',
                        // rightComponent: {
                        //     name: 'LastComm', props: { value: lastComm },
                        // },
                        // rightComponent: {
                        //     name: 'LastComm', props: { value: lastComm },
                        // },
                      },
                    },
                  ],
                },
                {
                  layout: 'row' as const,
                  className: 'justify-between w-full',
                  span: { col: 3, row: 1 },

                  columns: [
                    {
                      name: 'PageInformation',
                      props: {
                        gridColumns: 4,
                        rows: [
                          {
                            layout: 'row',
                            className:
                              'justify-between w-full bg-background-secondary dark:bg-white/5 rounded-2xl px-4 py-4',
                            span: { col: 5, row: 1 },
                            items: [
                              {
                                title: 'DTR No',
                                value: dtr.dtrNo,
                                align: 'start',
                                gap: 'gap-1',
                              },
                              {
                                title: 'DTR Name',
                                value: dtr.name,
                                align: 'start',
                                gap: 'gap-1',
                                statusIndicator: true,
                                statusType:dtr.condition,
                              },
                              {
                                title: 'Division',
                                value: dtr.division || 'N/A',
                                align: 'start',
                                gap: 'gap-1',
                              },
                              {
                                title: 'Sub-Division',
                                value: dtr.subDivision || 'N/A',
                                align: 'start',
                                gap: 'gap-1',
                              },
                              // {
                              //     title: 'Substation',
                              //     value: locationHierarchy.find(loc => loc.type === 'Substation')?.name || 'N/A',
                              //     align: 'start',
                              //     gap: 'gap-1'
                              // }
                            ],
                          },
                          {
                            layout: 'row',
                            className: 'justify-between w-full',
                            span: { col: 5, row: 1 },
                            items: [
                              // {
                              //     title: 'Condition',
                              //     value: dtr.condiztion,
                              //     align: 'start',
                              //     gap: 'gap-1'
                              // },
                              {
                                title: 'Capacity',
                                value: dtr.capacity,
                                align: 'start',
                                gap: 'gap-1',
                              },
                              {
                                title: 'Address',
                                value: dtr.address,
                                align: 'start',
                                gap: 'gap-1',
                              },
                              {
                                title: 'Latitude',
                                value: dtr.location.lat !== 0 ? dtr.location.lat.toFixed(6) : 'N/A',
                                align: 'start',
                                gap: 'gap-1',
                              },
                              {
                                title: 'Longitude',
                                value: dtr.location.lng !== 0 ? dtr.location.lng.toFixed(6) : 'N/A',
                                align: 'start',
                                gap: 'gap-1',
                              },
                            ],
                          },
                        ],
                      },
                    },
                  ],
                },
              ],
            },
          },
          {
            layout: {
              type: 'grid' as const,
              columns: 1,
              className:
                'w-full p-4 border border-primary-border dark:border-dark-border rounded-3xl bg-background-secondary dark:bg-primary-dark-light',
              rows: [
                {
                  layout: 'row' as const,
                  className: 'justify-between w-full ',
                  span: { col: 1, row: 1 },
                  columns: [
                    {
                      name: 'SectionHeader',
                      props: {
                        title: 'Distribution Transformer (DTR) Statistics',
                        titleLevel: 2,
                        titleSize: 'lg',
                        titleVariant: '',
                        titleWeight: 'bold',
                        titleAlign: 'left',
                        className: 'w-full',
                        // rightComponent: { name: 'LastComm', props: { value: lastComm } },
                      },
                      span: { col: 1, row: 1 },
                    },
                  ],
                },
                {
                  layout: 'grid' as const,
                  gridColumns: 5,
                  className: 'w-full gap-4',
                  columns: stats.map((stat) => ({
                    name: 'Card',
                    props: {
                      title: stat.title,
                      value: stat.value,
                      subtitle1: stat.subtitle1,
                      icon: stat.icon,
                      bg: stat.bg || 'bg-stat-icon-gradient',
                      valueFontSize:
                        stat.valueFontSize || 'text-lg lg:text-xl md:text-lg sm:text-base',
                      iconStyle: stat.iconStyle || FILTER_STYLES.BRAND_GREEN,
                      loading: isStatsLoading,
                    },
                    span: { col: 1, row: 1 },
                  })),
                },
              ],
            },
          },
          {
            layout: {
              type: 'grid' as const,
              columns: 1,
              className: '',
              rows: [
                {
                  layout: 'grid' as const,
                  gridColumns: 1,
                  columns: [
                    {
                      name: 'RightAngle',
                      props: {
                        // Use actual data from API based on selected time range
                        kwh:
                          Number(
                            selectedTimeRange === 'Daily'
                              ? dtrConsumptionData.daily.totalKwh
                              : dtrConsumptionData.monthly.totalKwh
                          ) || 0,
                        kvarh: calculateKvarh(
                          Number(
                            selectedTimeRange === 'Daily'
                              ? dtrConsumptionData.daily.totalKvah
                              : dtrConsumptionData.monthly.totalKvah
                          ) || 0,
                          Number(
                            selectedTimeRange === 'Daily'
                              ? dtrConsumptionData.daily.totalKwh
                              : dtrConsumptionData.monthly.totalKwh
                          ) || 0
                        ),
                        kvah:
                          Number(
                            selectedTimeRange === 'Daily'
                              ? dtrConsumptionData.daily.totalKvah
                              : dtrConsumptionData.monthly.totalKvah
                          ) || 0,
                        height: '400px',
                        kwhColor: '#dc2626',
                        kvarhColor: '#163b7c',
                        kvahColor: '#22c55e',
                        textColor: '#374151',
                        showOriginMarker: true, // Show origin point
                        showHeader: true,
                        headerTitle: 'Power Triangle',
                        prependTimeRangeInTitle: true,
                        showDownloadButton: true,
                        isLoading: _isConsumptionLoading,
                        availableTimeRanges: ['Daily', 'Monthly'],
                        selectedTimeRange: selectedTimeRange,
                        onTimeRangeChange: (range: 'Daily' | 'Monthly') =>
                          setSelectedTimeRange(range),
                        inverse: false,
                        statsSectionPosition: 'right',
                      },
                    },
                  ],
                },
              ],
            },
          },
          {
            layout: {
              type: 'grid' as const,
              columns: 1,
              className: '',
              rows: [
                {
                  layout: 'grid' as const,
                  gridColumns: 1,
                  columns: [
                    {
                      name: 'Table',
                      props: {
                        columns: [
                          { key: 'sNo', label: 'S.No' },
                          { key: 'feederName', label: 'Feeder Name' },
                          {
                            key: 'loadStatus',
                            label: 'Status',
                            statusIndicator: {},
                            isActive: (value: string | number | boolean | null | undefined) =>
                              String(value).toLowerCase() === 'active',
                          },
                          // { key: 'condition', label: 'Condition' },
                          // { key: 'capacity', label: 'Capacity' },
                          // { key: 'address', label: 'Address' },
                        ],
                        data: feedersData,
                        searchable: true,
                        pagination: true,
                        initialRowsPerPage: 10,
                        rowsPerPageOptions: [5, 10, 15, 20, 25],
                        emptyMessage: 'No Feeders Found',
                        showActions: true,
                        title: 'DTR Feeders',
                        headerTitle: 'DTR Feeders',
                        showHeader: true,
                        showPaginationInfo: true,
                        showRowsPerPageSelector: true,
                        className: 'w-full',
                        onExport: handleFeedersExport,
                        onRowClick: (row: any) => handleFeederClick(row.feederName),
                        actions: [
                          {
                            label: 'View',
                            icon: 'icons/eye.svg',
                            onClick: handleFeederView,
                            variant: 'primary',
                            size: 'sm',
                          },
                        ],
                        loading: isFeedersLoading,
                      },
                    },
                  ],
                },
              ],
            },
          },

          {
            layout: {
              type: 'grid' as const,
              columns: 1,
              className: '',
              rows: [
                {
                  layout: 'grid' as const,
                  gridColumns: 1,
                  columns: [
                    {
                      name: 'CapacityGauge',
                      props: {
                        showHeader: true,
                        showDownloadButton: true,
                        capacities: [
                          {
                            capacity: capacityUsage.instantly,
                            centerLabel: `${capacityUsage.instantKVA} kVA`,
                            filledColor: '#163B7C',
                            unfilledColor: '#e5e7eb',
                            label: 'Instant',
                            date: capacityUsage.instantLastCommDate,
                          },
                          {
                            capacity: capacityUsage.daily,
                            centerLabel: `${capacityUsage.dailyMdkva} MDkVA`,
                            filledColor: '#dc2626',
                            unfilledColor: '#e5e7eb',
                            label: 'Daily',
                            date: capacityUsage.dailyLastCommDate,
                          },
                          {
                            capacity: capacityUsage.monthly,
                            centerLabel: `${capacityUsage.monthlyMdkva} MDkVA`,
                            filledColor: '#eab308',
                            unfilledColor: '#e5e7eb',
                            label: 'Monthly',
                            date: capacityUsage.monthlyLastCommDate,
                          },
                          {
                            capacity: capacityUsage.yearly,
                            centerLabel: `${capacityUsage.yearlyMdkva} MDkVA`,
                            filledColor: '#3b82f6',
                            unfilledColor: '#e5e7eb',
                            label: 'Yearly',
                            date: capacityUsage.yearlyLastCommDate,
                          },
                          {
                            capacity: capacityUsage.lifeTime,
                            centerLabel: `${capacityUsage.lifeTimeMdkva} MDkVA`,
                            filledColor: '#059669',
                            unfilledColor: '#e5e7eb',
                            label: 'LifeTime',
                            date: capacityUsage.lifeTimeLastCommDate,
                          },
                        ],
                        enableAnimation: true,
                        animationDuration: 2000,
                        enableHover: true,
                        gridColumns: 5,
                        gap: 'gap-30',
                        justifyContent: 'center',
                      },
                    },
                    //  threshold: kvaMetricsData.thresholdValue || 0,
                    //  ratingKVA:
                    //    kvaMetricsData.capacityInfo?.dtrCapacity || 50,
                  ],
                },
              ],
            },
          },
          // {
          //   layout: {
          //     type: "grid" as const,
          //     columns: 1,
          //     className: "",
          //     rows: [
          //       {
          //         layout: "grid" as const,
          //         className: "w-full",
          //         columns: [
          //           {
          //             name: "GoogleMap",
          //             props: {
          //               title: "Feeder Location",
          //               hasDownload: true,
          //               apiKey: "AIzaSyCzGAzUjgicpxShXVusiguSnosdmsdQ7WI",
          //               center: mapCenter,
          //               zoom: mapZoom,
          //               libraries: ["places"],
          //               markers: (() => {
          //                 // If we have specific feeder data, show only that feeder
          //                 if (dtr?.location) {
          //                   return [
          //                     {
          //                       position: {
          //                         lat: dtr.location.lat || mapLatitude,
          //                         lng: dtr.location.lng || mapLongitude,
          //                       },
          //                     },
          //                   ];
          //                 }

          //                 // This section was removed because dtr.location is an object, not an array

          //                 // Fallback to single marker at center
          //                 return [
          //                   {
          //                     position: { lat: mapLatitude, lng: mapLongitude },
          //                     title: "Feeder Location",
          //                     infoContent: `<div><strong>Feeder Location</strong><br/>Coordinates: ${mapLatitude}, ${mapLongitude}</div>`,
          //                   },
          //                 ];
          //               })(),
          //               mapOptions: {
          //                 disableDefaultUI: false,
          //                 zoomControl: true,
          //                 mapTypeControl: true,
          //                 scaleControl: true,
          //                 streetViewControl: true,
          //                 rotateControl: true,
          //                 fullscreenControl: true,
          //               },
          //               onReady: (_map: any, _google: any) => {},
          //               onClick: (e: any) => {
          //                 const clickedCoords = e.latLng?.toJSON();
          //                 if (clickedCoords) {
          //                   // You could add a temporary marker here or show coordinates in a tooltip
          //                 }
          //               },
          //               onIdle: () => {},
          //             },
          //           },
          //         ],
          //       },
          //     ],
          //   },
          // },
          {
            layout: {
              type: 'grid' as const,
              columns: 1,
              className: '',
              rows: [
                {
                  layout: 'grid' as const,
                  gridColumns: 1,
                  columns: [
                    {
                      name: 'ThresholdChart',
                      props: {
                        data: getKvaMetricsData().seriesData[0]?.data || [],
                        thresholds: [
                          {
                            value: kvaMetricsData.underloadThreshold || 0,
                            label: `Transformer Capacity (${
                              kvaMetricsData.capacityInfo?.dtrCapacity || 50
                            }kVA) - Underload Threshold (${
                              kvaMetricsData.underloadThreshold || 0
                            }kWh/day)`,
                            color: '#27ae60',
                            lineStyle: 'dashed',
                          },
                          {
                            value: kvaMetricsData.overloadThreshold || 0,
                            label: `Transformer Capacity (${
                              kvaMetricsData.capacityInfo?.dtrCapacity || 50
                            }kVA) - Overload Threshold (${
                              kvaMetricsData.overloadThreshold || 0
                            }kVAh/day)`,
                            color: '#e74c3c',
                            lineStyle: 'dashed',
                          },
                        ],
                        ratingKVA: kvaMetricsData.capacityInfo?.dtrCapacity || 50,
                        title: `KVA Metrics - ${kvaTimeRange}`,
                        chartType: 'bar',
                        availableTimeRanges: ['Daily', 'Monthly'],
                        selectedTimeRange: kvaTimeRange,
                        onTimeRangeChange: (range: 'Daily' | 'Monthly') => setKvaTimeRange(range),
                        loading: isKvaMetricsLoading,
                        highestKVA:
                          kvaTimeRange === 'Daily'
                            ? kvaMetricsData.highestKVA?.daily
                            : kvaMetricsData.highestKVA?.monthly,
                        capacityInfo: kvaMetricsData.capacityInfo,
                        xAxisData: getKvaMetricsData().xAxisData || [],
                        showCapacityInfo: true,
                        showHighestKVA: true,
                        showThresholds: true,
                        seriesColors: ['#163b7c', '#55b56c', '#dc272c', '#ed8c22'],
                      },
                      span: { col: 1, row: 1 },
                    },
                  ],
                },
              ],
            },
          },
          {
            layout: {
              type: 'grid' as const,
              columns: 1,
              className: '',
              rows: [
                {
                  layout: 'grid' as const,
                  gridColumns: 1,
                  className: 'pb-4',
                  columns: [
                    {
                      name: 'Table',
                      props: {
                        columns: [
                          // Use non-special key to avoid auto-numbering; render backend sNo explicitly
                          {
                            key: 'serialNo',
                            label: 'S.No',
                            render: (_value: any, row: any) =>
                              row && row.sNo !== undefined && row.sNo !== null ? row.sNo : '',
                          },
                          // { key: "alertId", label: "Alert ID" },
                          { key: 'type', label: 'Event Type' },
                          { key: 'feederName', label: 'Meter Number' },
                          { key: 'occuredOn', label: 'Occured On' },
                          { key: 'duration', label: 'Duration' },
                          { key: 'status', label: 'Status' ,
                          statusIndicator: {},
                          isActive: (value: string) => value.toLowerCase() === "resolved",
                          }
                        ],
                        data: alertsData,
                        searchable: true,
                        pagination: true,
                        initialRowsPerPage: 10,
                        rowsPerPageOptions: [5, 10, 15, 20, 25],
                        emptyMessage: 'No Alerts Found',
                        showActions: false,
                        title: 'DTR Alerts',
                        headerTitle: 'DTR Alerts',
                        showHeader: true,
                        showPaginationInfo: true,
                        showRowsPerPageSelector: true,
                        className: 'w-full',
                        serverPagination: alertsPagination,
                        onPageChange: handleAlertsPageChange,
                        loading: isAlertsLoading,
                      },
                    },
                  ],
                },
              ],
            },
          },
          {
            layout: {
              type: 'grid' as const,
              columns: 1,
              className: '',
              rows: [
                {
                  layout: 'grid' as const,
                  gridColumns: 1,
                  columns: [
                    {
                      name: 'Modal',
                      props: {
                        title: 'Confirm Status Change',
                        message: `Are you sure you want to change the status of this DTR to ${pendingStatus.toUpperCase()}?`,
                        onConfirm: handleConfirmStatusChange,
                        onClose: handleCancelStatusChange,
                        isOpen: isStatusModalOpen,
                        showConfirmButton: true,
                        confirmButtonLabel: isUpdatingStatus ? 'Updating...' : 'Confirm',
                        confirmButtonVariant: 'primary',
                        showCloseIcon: true,
                        backdropClosable: false,
                        size: 'md',
                      },
                    },
                    {
                      name: 'Modal',
                      props: {
                        isOpen: isHierarchyModalOpen,
                        onClose: handleCloseHierarchyModal,
                        title: 'Update Hierarchy',
                        size: 'md',
                        showCloseIcon: true,
                        backdropClosable: !isUpdatingHierarchy,
                        centered: true,
                        showForm: true,
                        formFields: hierarchyFormFields,
                        onSave: () => {
                          void handleConfirmHierarchyUpdate();
                        },
                        saveButtonLabel: isUpdatingHierarchy ? 'Updating...' : 'Update',
                        cancelButtonLabel: 'Cancel',
                        cancelButtonVariant: 'secondary',
                        gridLayout: {
                          gridRows: 6,
                          gridColumns: 1,
                          gap: 'gap-4',
                        },
                      },
                    },
                  ],
                },
              ],
            },
          },
        ]}
      />
      <CapacityUpdateModal
        isOpen={isCapacityModalOpen}
        initialCapacity={capacityModalInitial}
        isUpdating={isUpdatingCapacity}
        onClose={handleCloseCapacityModal}
        onConfirm={(capacity) => {
          void handleCapacityUpdate(capacity);
        }}
      />
    </div>
  );
};

export default DTRDetailPage;
