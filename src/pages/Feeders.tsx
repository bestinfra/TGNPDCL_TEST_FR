import { lazy, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import BACKEND_URL from "../config";
import { FILTER_STYLES } from "../contexts/FilterStyleContext";
import { exportChartData } from "../utils/excelExport";
const Page = lazy(() => import("SuperAdmin/Page"));

// Dummy data for fallbackf
const dummyInstantaneousStatsData = {
    rphVolt: "0",
    yphVolt: "0",
    bphVolt: "0",
    instantKVA: "0",
    mdKVA: "0",
    rphCurr: "0",
    yphCurr: "0",
    bphCurr: "0",
    neutralCurrent: "0",
    freqHz: "0",
    rphPF: "0",
    yphPF: "0",
    bphPF: "0",
    avgPF: "0",
    cumulativeKVAh: "0",
    lastCommDate: null,
};

const dummyConsumptionAnalyticsData = {
    xAxisData: ["0"],
    seriesData: [{ name: "Consumption", data: [0] }],
    monthly: {
        xAxisData: ["0"],
        seriesData: [{ name: "Consumption", data: [0] }],
    },
};

const dummyFeederInfoData = {
    dtr: {
        dtrNumber: "0",
        capacity: "0",
        status: "N/A",
    },
    totalFeeders: "0",
};

const dummyAlertsData = [
    {
        alertId: "ALT001",
        type: "Overload",
        feederName: "D1F1(32500114)",
        occuredOn: "2024-01-15 14:30:00",
    },
    {
        alertId: "ALT002",
        type: "Power Failure",
        feederName: "D1F1(32500114)",
        occuredOn: "2024-01-15 12:15:00",
    },
];

// Default stats data
const defaultStats = [
    {
        title: "R-Phase Voltage",
        value: "0",
        icon: "icons/r-phase-voltage.svg",
        subtitle1: "Volts",
        bg: "bg-[var(--color-danger)]",
        iconClassName: "w-3 h-3",
        width: "w-8",
        height: "h-8",
        valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
        iconStyle: FILTER_STYLES.WHITE,
    },
    {
        title: "Y-Phase Voltage",
        value: "0",
        icon: "icons/r-phase-voltage.svg",
        subtitle1: "Volts",
        bg: "bg-[var(--color-warning-alt)]",
        iconClassName: "w-3 h-3",
        width: "w-8",
        height: "h-8",
        valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
        iconStyle: FILTER_STYLES.WHITE,
    },
    {
        title: "B-Phase Voltage",
        value: "0",
        icon: "icons/r-phase-voltage.svg",
        subtitle1: "Volts",
        bg: "bg-[var(--color-primary)]",
        iconClassName: "w-3 h-3",
        width: "w-8",
        height: "h-8",
        valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
        iconStyle: FILTER_STYLES.WHITE,
    },
    {
        title: "Apparent Power",
        value: "0",
        icon: "icons/consumption.svg",
        subtitle1: "kVA",
        valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
        iconStyle: FILTER_STYLES.BRAND_GREEN,
    },
    {
        title: "MD-kVA",
        value: "0",
        icon: "icons/consumption.svg",
        subtitle1: "kVA",
        valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
        iconStyle: FILTER_STYLES.BRAND_GREEN,
    },
    {
        title: "R-Phase Current",
        value: "0",
        icon: "icons/r-phase-current.svg",
        subtitle1: "Amps",
        bg: "bg-[var(--color-danger)]",
        iconClassName: "w-3 h-3",
        width: "w-8",
        height: "h-8",
        valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
        iconStyle: FILTER_STYLES.WHITE,
    },
    {
        title: "Y-Phase Current",
        value: "0",
        icon: "icons/r-phase-current.svg",
        subtitle1: "Amps",
        bg: "bg-[var(--color-warning-alt)]",
        iconClassName: "w-3 h-3",
        width: "w-8",
        height: "h-8",
        valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
        iconStyle: FILTER_STYLES.WHITE,
    },
    {
        title: "B-Phase Current",
        value: "0",
        icon: "icons/r-phase-current.svg",
        subtitle1: "Amps",
        bg: "bg-[var(--color-primary)]",
        iconClassName: "w-3 h-3",
        width: "w-8",
        height: "h-8",
        valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
        iconStyle: FILTER_STYLES.WHITE,
    },
    {
        title: "Neutral Current",
        value: "0",
        icon: "icons/consumption.svg",
        subtitle1: "Amps",
        valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
        iconStyle: FILTER_STYLES.BRAND_GREEN,
    },
    {
        title: "Frequency",
        value: "0",
        icon: "icons/frequency.svg",
        subtitle1: "Hz",
        valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
        iconStyle: FILTER_STYLES.BRAND_GREEN,
    },
    {
        title: "R-Phase PF",
        value: "0",
        icon: "icons/power-factor.svg",
        subtitle1: "Power Factor",
        bg: "bg-[var(--color-danger)]",
        iconClassName: "w-4 h-4",
        width: "w-8",
        height: "h-8",
        valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
        iconStyle: FILTER_STYLES.WHITE,
    },
    {
        title: "Y-Phase PF",
        value: "0",
        icon: "icons/power-factor.svg",
        subtitle1: "Power Factor",
        bg: "bg-[var(--color-warning-alt)]",
        iconClassName: "w-4 h-4",
        width: "w-8",
        height: "h-8",
        valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
        iconStyle: FILTER_STYLES.WHITE,
    },
    {
        title: "B-Phase PF",
        value: "0",
        icon: "icons/power-factor.svg",
        subtitle1: "Power Factor",
        bg: "bg-[var(--color-primary)]",
        iconClassName: "w-4 h-4",
        width: "w-8",
        height: "h-8",
        valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
        iconStyle: FILTER_STYLES.WHITE,
    },
    {
        title: "Avg PF",
        value: "0",
        icon: "icons/power-factor.svg",
        subtitle1: "Power Factor",
        valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
        iconStyle: FILTER_STYLES.BRAND_GREEN,
    },
    {
        title: "Active Power",
        value: "0",
        icon: "icons/consumption.svg",
        subtitle1: "kW",
        valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
        iconStyle: FILTER_STYLES.BRAND_GREEN,
    },
];

const Feeders = () => {
    const { dtrId, feederId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Helper function to calculate power factor angle (θ = cos⁻¹(|PF|) with preserved sign)
    const calculatePowerFactorAngle = (
        powerFactor: string | number
    ): number => {
        // Convert to number first
        const pfString =
            typeof powerFactor === "string"
                ? powerFactor
                : powerFactor.toString();
        const pf = parseFloat(pfString || "0");

        // Handle invalid values
        if (isNaN(pf)) return 0;

        // Get absolute value and clamp to valid range [0, 1]
        const absPF = Math.abs(pf);
        const clampedPF = Math.min(1, Math.max(0, absPF));

        // Calculate angle in radians then convert to degrees
        const thetaRad = Math.acos(clampedPF);
        const thetaDeg = (thetaRad * 180) / Math.PI;

        // Preserve the sign: negative PF = leading (negative angle), positive PF = lagging (positive angle)
        // Use explicit comparison to handle negative zero and ensure proper sign preservation
        return pf < 0 ? -Math.abs(thetaDeg) : Math.abs(thetaDeg);
    };

    // Get passed data from navigation state
    const passedData = location.state as {
        feederData?: {
            sNo: number;
            feederName: string;
            loadStatus: string;
            rating: string;
            address: string;
            dtrId?: string;
            dtrNumber?: string;
            alertType?: string;
            alertId?: string;
            occuredOn?: string;
        };
        dtrId?: string;
        dtrName?: string;
        dtrNumber?: string;
        feederId?: string;
    } | null;

    // Determine if this is an individual feeder page or DTR page
    const isIndividualFeeder = !!feederId;
    const currentFeederId = feederId || dtrId;

    // Use passed feeder data if available, otherwise use default
    const feederData = passedData?.feederData;

    // If we have a feederId but no passedData, we need to construct the data structure
    // This handles the case when navigating directly to /feeder/SN18132429
    const effectiveFeederData =
        passedData?.feederData ||
        (feederId
            ? {
                  feederName: feederId,
                  // We'll need to get other feeder details from the API
              }
            : null);

    // Determine the effective DTR ID to use for API calls
    const getEffectiveDtrId = () => {
        // First try passedData.dtrId (from navigation state)
        if (passedData?.dtrId) {
            return passedData.dtrId;
        }

        // Then try to extract from dtrId parameter
        if (dtrId && dtrId.match(/\d+/)?.[0]) {
            return dtrId.match(/\d+/)?.[0];
        }

        // If we have a feederId, we need to find the DTR ID from the backend
        if (feederId) {
            return null; // We'll need to handle this specially
        }

        return dtrId;
    };

    const effectiveDtrId = getEffectiveDtrId();

    // Function to find DTR ID from feeder ID
    const findDtrIdFromFeederId = async (
        feederId: string
    ): Promise<string | null> => {
        try {
            // We need to search for the feeder to find its DTR ID
            // This could be done by searching through all DTRs or by a specific feeder search endpoint
            // For now, let's try to search through the DTRs endpoint with a search parameter

            // Option 1: Search through DTRs with feeder name
            const searchResponse = await fetch(
                `${BACKEND_URL}/dtrs?search=${feederId}`
            );
            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                if (searchData.success && searchData.data.length > 0) {
                    // Find the DTR that contains this feeder
                    for (const dtr of searchData.data) {
                        // Check if this DTR has the feeder
                        const dtrResponse = await fetch(
                            `${BACKEND_URL}/dtrs/${dtr.dtrId || dtr.dtrNumber}`
                        );
                        if (dtrResponse.ok) {
                            const dtrData = await dtrResponse.json();
                            if (dtrData.success && dtrData.data?.feeders) {
                                const hasFeeder = dtrData.data.feeders.some(
                                    (feeder: any) =>
                                        feeder.serialNumber === feederId ||
                                        feeder.meterNumber === feederId
                                );
                                if (hasFeeder) {
                                    return dtr.dtrId || dtr.dtrNumber;
                                }
                            }
                        }
                    }
                }
            }

            return null;
        } catch (error) {
            return null;
        }
    };

    // State to store the resolved DTR ID when we find it from feeder ID
    const [resolvedDtrId, setResolvedDtrId] = useState<string | null>(
        effectiveDtrId || null
    );

    // State for API data - initialized with dummy data
    const [instantaneousStatsData, setInstantaneousStatsData] = useState<any>(
        dummyInstantaneousStatsData
    );
    const [consumptionAnalyticsData, setConsumptionAnalyticsData] =
        useState<any>(dummyConsumptionAnalyticsData);
    const [feederInfoData, setFeederInfoData] =
        useState<any>(dummyFeederInfoData);
    const [alertsData, setAlertsData] = useState(dummyAlertsData);

    // State for map coordinates - initialized with default coordinates
    const [mapLatitude, setMapLatitude] = useState<number>(17.992887);
    const [mapLongitude, setMapLongitude] = useState<number>(79.550835);

    // Loading states - initialized to false
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    const [isConsumptionLoading, setIsConsumptionLoading] = useState(false);
    const [isAlertsLoading, setIsAlertsLoading] = useState(false);
    //const [isKvaMetricsLoading, setIsKvaMetricsLoading] = useState(false);

    // State for tracking failed APIs
    const [failedApis, setFailedApis] = useState<
        Array<{
            id: string;
            name: string;
            retryFunction: () => Promise<void>;
            errorMessage: string;
        }>
    >([]);

    // State for time range toggles
    const [consumptionTimeRange, setConsumptionTimeRange] = useState<
        "Daily" | "Monthly"
    >("Daily");

    // State for Modal to show clicked bar details
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{
        date?: string;
        value?: number;
        seriesName?: string;
        timeRange?: string;
        lineData?: number[];
        lineXAxis?: string[];
        headerTitle?: string;
    } | null>(null);

    const handleModalOpen = (data: any) => {
        setModalData(data);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setModalData(null);
    };

    // API Functions
    const fetchInstantaneousStats = async () => {
        // Use resolved DTR ID
        let numericDtrId = resolvedDtrId;

        // If we don't have a DTR ID but we have a feeder ID, we need to find the DTR ID first
        if (!numericDtrId && feederId) {
            const foundDtrId = await findDtrIdFromFeederId(feederId);
            if (foundDtrId) {
                setResolvedDtrId(foundDtrId);
                numericDtrId = foundDtrId;
            } else {
                return;
            }
        }

        if (!numericDtrId) {
            return;
        }

        setIsStatsLoading(true);
        try {
            // Build endpoint; pass feederId (meter identifier) when available
            const meterIdentifier =
                passedData?.feederId ||
                effectiveFeederData?.feederName ||
                feederId ||
                "";

            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}/instantaneousStats`;
            if (meterIdentifier) {
                const qp = new URLSearchParams({ feederId: meterIdentifier });
                endpoint = `${endpoint}?${qp.toString()}`;
            }

            const response = await fetch(endpoint);
            const data = await response.json();

            if (data.success) {
                // If we have specific feeder data, we might need to adjust the data
                let apiData = {
                    ...data.data,
                    lastCommDate: data.data.lastCommDate || null,
                };

                // No further adjustment needed; backend filters by meter when feederId provided
                setInstantaneousStatsData(apiData);
            } else {
                throw new Error(
                    data.message || "Failed to fetch instantaneous stats"
                );
            }
        } catch (error: any) {
            setInstantaneousStatsData(dummyInstantaneousStatsData);
            setFailedApis((prev) => [
                ...prev,
                {
                    id: "instantaneousStats",
                    name: "Instantaneous Stats",
                    retryFunction: fetchInstantaneousStats,
                    errorMessage:
                        error.message || "Failed to fetch instantaneous stats",
                },
            ]);
        } finally {
            setIsStatsLoading(false);
        }
    };

    const fetchConsumptionAnalytics = async () => {
        // Use resolved DTR ID
        let numericDtrId = resolvedDtrId;

        // If we don't have a DTR ID but we have a feeder ID, we need to find the DTR ID first
        if (!numericDtrId && feederId) {
            const foundDtrId = await findDtrIdFromFeederId(feederId);
            if (foundDtrId) {
                setResolvedDtrId(foundDtrId);
                numericDtrId = foundDtrId;
            } else {
                return;
            }
        }

        if (!numericDtrId) {
            return;
        }

        setIsConsumptionLoading(true);
        try {
            const meterIdentifier =
                passedData?.feederId ||
                effectiveFeederData?.feederName ||
                feederId ||
                "";
            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}/consumptionAnalytics`;
            if (meterIdentifier) {
                const qp = new URLSearchParams({ feederId: meterIdentifier });
                endpoint = `${endpoint}?${qp.toString()}`;
            }

            const response = await fetch(endpoint);
            const data = await response.json();

            if (data.status === "success") {
                // Transform the data to match frontend expectations
                let transformedData = {
                    xAxisData: data.data.dailyData?.xAxisData || [],
                    seriesData: [
                        {
                            name: "Consumption",
                            data:
                                data.data.dailyData?.sums?.map((sum: string) =>
                                    parseFloat(sum)
                                ) || [],
                        },
                    ],
                    monthly: {
                        xAxisData: data.data.monthlyData?.xAxisData || [],
                        seriesData: [
                            {
                                name: "Consumption",
                                data:
                                    data.data.monthlyData?.sums?.map(
                                        (sum: string) => parseFloat(sum)
                                    ) || [],
                            },
                        ],
                    },
                };

                // If this is for a specific feeder, we might need to adjust the data
                if (effectiveFeederData?.feederName) {
                    // For now, use the DTR-level data, but this could be enhanced
                    // when backend supports individual meter consumption
                }

                setConsumptionAnalyticsData(transformedData);
            } else {
                throw new Error(
                    data.message || "Failed to fetch consumption analytics"
                );
            }
        } catch (error: any) {
            setConsumptionAnalyticsData(dummyConsumptionAnalyticsData);
            setFailedApis((prev) => [
                ...prev,
                {
                    id: "consumptionAnalytics",
                    name: "Consumption Analytics",
                    retryFunction: fetchConsumptionAnalytics,
                    errorMessage:
                        error.message ||
                        "Failed to fetch consumption analytics",
                },
            ]);
        } finally {
            setIsConsumptionLoading(false);
        }
    };

    const fetchFeederInfo = async () => {
        // Use resolved DTR ID
        let numericDtrId = resolvedDtrId;

        // If we don't have a DTR ID but we have a feeder ID, we need to find the DTR ID first
        if (!numericDtrId && feederId) {
            const foundDtrId = await findDtrIdFromFeederId(feederId);
            if (foundDtrId) {
                setResolvedDtrId(foundDtrId);
                numericDtrId = foundDtrId;
            } else {
                return;
            }
        }

        if (!numericDtrId) {
            return;
        }

        try {
            const meterIdentifier =
                passedData?.feederId ||
                effectiveFeederData?.feederName ||
                feederId ||
                "";
            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}`;
            if (meterIdentifier) {
                const qp = new URLSearchParams({ feederId: meterIdentifier });
                endpoint = `${endpoint}?${qp.toString()}`;
            }

            const response = await fetch(endpoint);
            const data = await response.json();

            if (data.success) {
                let feederInfo = data.data;
                // If this is for a specific feeder, we need to filter the data
                if (effectiveFeederData?.feederName) {
                    const feederName = effectiveFeederData.feederName;

                    // Find the specific feeder in the DTR's feeders list
                    const specificFeeder = feederInfo.feeders?.find(
                        (feeder: any) =>
                            feeder.serialNumber === feederName ||
                            feeder.meterNumber === feederName
                    );

                    if (specificFeeder) {
                        // Store the actual total feeders count before filtering
                        const actualTotalFeeders =
                            feederInfo.feeders?.length || 1;

                        feederInfo = {
                            dtr: feederInfo.dtr,
                            totalFeeders: actualTotalFeeders, // Use actual DTR's total feeder count
                            specificFeeder: {
                                serialNumber: specificFeeder.serialNumber,
                                meterNumber: specificFeeder.meterNumber,
                                manufacturer: specificFeeder.manufacturer,
                                model: specificFeeder.model,
                                type: specificFeeder.type,
                                phase: specificFeeder.phase,
                                status: specificFeeder.status,
                                location: specificFeeder.location,
                                city: specificFeeder.city,
                                latitude: specificFeeder.latitude,
                                longitude: specificFeeder.longitude,
                            },
                        };
                        setMapLatitude(specificFeeder.latitude || 17.992887);
                        setMapLongitude(specificFeeder.longitude || 79.550835);
                    } else {
                    }
                }

                // Update map coordinates based on available feeder data
                if (feederInfo.feeders && feederInfo.feeders.length > 0) {
                    // Use the first feeder's coordinates if available
                    const firstFeeder = feederInfo.feeders[0];
                    if (firstFeeder.latitude && firstFeeder.longitude) {
                        setMapLatitude(firstFeeder.latitude);
                        setMapLongitude(firstFeeder.longitude);
                    }
                }

                setFeederInfoData(feederInfo);
            } else {
                throw new Error(
                    data.message || "Failed to fetch feeder information"
                );
            }
        } catch (error: any) {
            setFeederInfoData(dummyFeederInfoData);
            setFailedApis((prev) => [
                ...prev,
                {
                    id: "feederInfo",
                    name: "Feeder Info",
                    retryFunction: fetchFeederInfo,
                    errorMessage:
                        error.message || "Failed to fetch feeder information",
                },
            ]);
        }
    };

    const fetchAlerts = async () => {
        // Use resolved DTR ID
        let numericDtrId = resolvedDtrId;

        // If we don't have a DTR ID but we have a feeder ID, we need to find the DTR ID first
        if (!numericDtrId && feederId) {
            const foundDtrId = await findDtrIdFromFeederId(feederId);
            if (foundDtrId) {
                setResolvedDtrId(foundDtrId);
                numericDtrId = foundDtrId;
            } else {
                return;
            }
        }

        if (!numericDtrId) {
            return;
        }

        setIsAlertsLoading(true);
        try {
            const meterIdentifier =
                passedData?.feederId ||
                effectiveFeederData?.feederName ||
                feederId ||
                "";
            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}/alerts`;
            if (meterIdentifier) {
                const qp = new URLSearchParams({ feederId: meterIdentifier });
                endpoint = `${endpoint}?${qp.toString()}`;
            }

            const response = await fetch(endpoint);
            const data = await response.json();

            if (data.success) {
                // Transform the data to ensure it matches the table column structure
                let transformedAlerts =
                    data.data?.map((alert: any) => ({
                        ...alert,
                        feederName:
                            effectiveFeederData?.feederName ||
                            alert.feederName ||
                            "-",
                    })) || [];

                if (effectiveFeederData?.feederName) {
                    const targetFeederName = effectiveFeederData.feederName;

                    transformedAlerts = transformedAlerts.map((alert: any) => ({
                        ...alert,
                        feederName: targetFeederName,
                    }));
                }

                // If transformation resulted in all - values, log the raw data for debugging
                if (
                    transformedAlerts.every(
                        (alert: any) =>
                            alert.alertId === "-" &&
                            alert.type === "-" &&
                            alert.feederName === "-" &&
                            alert.occuredOn === "-"
                    )
                ) {
                }

                setAlertsData(transformedAlerts);
            } else {
                throw new Error(data.message || "Failed to fetch alerts");
            }
        } catch (error: any) {
            setAlertsData(dummyAlertsData);
            setFailedApis((prev) => [
                ...prev,
                {
                    id: "alerts",
                    name: "Alerts",
                    retryFunction: fetchAlerts,
                    errorMessage: error.message || "Failed to fetch alerts",
                },
            ]);
        } finally {
            setIsAlertsLoading(false);
        }
    };

    const fetchKVAMetrics = async () => {
        // Use resolved DTR ID
        let numericDtrId = resolvedDtrId;

        // If we don't have a DTR ID but we have a feeder ID, we need to find the DTR ID first
        if (!numericDtrId && feederId) {
            const foundDtrId = await findDtrIdFromFeederId(feederId);
            if (foundDtrId) {
                setResolvedDtrId(foundDtrId);
                numericDtrId = foundDtrId;
            } else {
                return;
            }
        }

        if (!numericDtrId) {
            return;
        }

        // setIsKvaMetricsLoading(true);
        try {
            const meterIdentifier =
                passedData?.feederId ||
                effectiveFeederData?.feederName ||
                feederId ||
                "";
            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}/kvaMetrics`;
            if (meterIdentifier) {
                const qp = new URLSearchParams({ feederId: meterIdentifier });
                endpoint = `${endpoint}?${qp.toString()}`;
            }

            const response = await fetch(endpoint);
            const data = await response.json();

            if (data.status === "success") {
                // Store the complete KVA metrics data with capacity info
                // setKvaMetricsData removed - not used in active code
            } else {
                throw new Error(data.message || "Failed to fetch KVA metrics");
            }
        } catch (error: any) {
            // setKvaMetricsData removed - not used in active code
            setFailedApis((prev) => [
                ...prev,
                {
                    id: "kvaMetrics",
                    name: "KVA Metrics",
                    retryFunction: fetchKVAMetrics,
                    errorMessage:
                        error.message || "Failed to fetch KVA metrics",
                },
            ]);
        } finally {
            // setIsKvaMetricsLoading(false);
        }
    };

    // Generate stats from API data or use defaults
    const getStats = () => {
        if (
            instantaneousStatsData &&
            Object.keys(instantaneousStatsData).length > 0 &&
            instantaneousStatsData.rphVolt !== "-"
        ) {
            return [
                {
                    title: "R-Phase Voltage",
                    value:
                        instantaneousStatsData.rphVolt?.toString() || "257.686",
                    icon: "icons/r-phase-voltage.svg",
                    subtitle1: "Volts",
                    bg: "bg-[var(--color-danger)]",
                    iconClassName: "w-3 h-3",
                    width: "w-8",
                    height: "h-8",
                    valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
                    iconStyle: FILTER_STYLES.WHITE,
                    loading: isStatsLoading,
                },
                {
                    title: "Y-Phase Voltage",
                    value:
                        instantaneousStatsData.yphVolt?.toString() || "255.089",
                    icon: "icons/r-phase-voltage.svg",
                    subtitle1: "Volts",
                    bg: "bg-[var(--color-warning-alt)]",
                    iconClassName: "w-3 h-3",
                    width: "w-8",
                    height: "h-8",
                    valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
                    iconStyle: FILTER_STYLES.WHITE,
                    loading: isStatsLoading,
                },
                {
                    title: "B-Phase Voltage",
                    value:
                        instantaneousStatsData.bphVolt?.toString() || "254.417",
                    icon: "icons/r-phase-voltage.svg",
                    subtitle1: "Volts",
                    bg: "bg-[var(--color-primary)]",
                    iconClassName: "w-3 h-3",
                    width: "w-8",
                    height: "h-8",
                    valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
                    iconStyle: FILTER_STYLES.WHITE,
                    loading: isStatsLoading,
                },
                {
                    title: "Apparent Power",
                    value:
                        instantaneousStatsData.instantKVA?.toString() ||
                        "19.527",
                    icon: "icons/consumption.svg",
                    subtitle1: "kVA",
                    valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
                    iconStyle: FILTER_STYLES.BRAND_GREEN,
                    loading: isStatsLoading,
                },
                {
                    title: "MD-kVA",
                    value: instantaneousStatsData.mdKVA?.toString() || "52.220",
                    icon: "icons/consumption.svg",
                    subtitle1: "kVA",
                    valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
                    iconStyle: FILTER_STYLES.BRAND_GREEN,
                    loading: isStatsLoading,
                },
                {
                    title: "R-Phase Current",
                    value:
                        instantaneousStatsData.rphCurr?.toString() || "15.892",
                    icon: "icons/r-phase-current.svg",
                    subtitle1: "Amps",
                    bg: "bg-[var(--color-danger)]",
                    iconClassName: "w-3 h-3",
                    width: "w-8",
                    height: "h-8",
                    valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
                    iconStyle: FILTER_STYLES.WHITE,
                    loading: isStatsLoading,
                },
                {
                    title: "Y-Phase Current",
                    value:
                        instantaneousStatsData.yphCurr?.toString() || "27.644",
                    icon: "icons/r-phase-current.svg",
                    subtitle1: "Amps",
                    bg: "bg-[var(--color-warning-alt)]",
                    iconClassName: "w-3 h-3",
                    width: "w-8",
                    height: "h-8",
                    valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
                    iconStyle: FILTER_STYLES.WHITE,
                    loading: isStatsLoading,
                },
                {
                    title: "B-Phase Current",
                    value:
                        instantaneousStatsData.bphCurr?.toString() || "33.984",
                    icon: "icons/r-phase-current.svg",
                    subtitle1: "Amps",
                    bg: "bg-[var(--color-primary)]",
                    iconClassName: "w-3 h-3",
                    width: "w-8",
                    height: "h-8",
                    valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
                    iconStyle: FILTER_STYLES.WHITE,
                    loading: isStatsLoading,
                },
                {
                    title: "Neutral Current",
                    value:
                        instantaneousStatsData.neutralCurrent?.toString() ||
                        "12.980",
                    icon: "icons/consumption.svg",
                    subtitle1: "Amps",
                    valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
                    iconStyle: FILTER_STYLES.BRAND_GREEN,
                    loading: isStatsLoading,
                },
                {
                    title: "Frequency",
                    value:
                        instantaneousStatsData.freqHz?.toString() || "49.980",
                    icon: "icons/frequency.svg",
                    subtitle1: "Hz",
                    valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
                    iconStyle: FILTER_STYLES.BRAND_GREEN,
                    loading: isStatsLoading,
                },
                {
                    title: "R-Phase PF",
                    value: instantaneousStatsData.rphPF?.toString() || "1.000",
                    icon: "icons/power-factor.svg",
                    subtitle1: "Power Factor",
                    bg: "bg-[var(--color-danger)]",
                    iconClassName: "w-4 h-4",
                    width: "w-8",
                    height: "h-8",
                    valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
                    iconStyle: FILTER_STYLES.WHITE,
                    loading: isStatsLoading,
                },
                {
                    title: "Y-Phase PF",
                    value: instantaneousStatsData.yphPF?.toString() || "-0.987",
                    icon: "icons/power-factor.svg",
                    subtitle1: "Power Factor",
                    bg: "bg-[var(--color-warning-alt)]",
                    iconClassName: "w-4 h-4",
                    width: "w-8",
                    height: "h-8",
                    valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
                    iconStyle: FILTER_STYLES.WHITE,
                    loading: isStatsLoading,
                },
                {
                    title: "B-Phase PF",
                    value: instantaneousStatsData.bphPF?.toString() || "0.998",
                    icon: "icons/power-factor.svg",
                    subtitle1: "Power Factor",
                    bg: "bg-[var(--color-primary)]",
                    iconClassName: "w-4 h-4",
                    width: "w-8",
                    height: "h-8",
                    valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
                    iconStyle: FILTER_STYLES.WHITE,
                    loading: isStatsLoading,
                },
                {
                    title: "Avg PF",
                    value: instantaneousStatsData.avgPF?.toString() || "-0.999",
                    icon: "icons/power-factor.svg",
                    subtitle1: "Power Factor",
                    valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
                    iconStyle: FILTER_STYLES.BRAND_GREEN,
                    loading: isStatsLoading,
                },
                {
                    title: "Active Power",
                    value:
                        instantaneousStatsData.cumulativeKVAh?.toString() ||
                        "77902.296",
                    icon: "icons/consumption.svg",
                    subtitle1: "kW",
                    valueFontSize: "text-lg lg:text-xl md:text-lg sm:text-base",
                    iconStyle: FILTER_STYLES.BRAND_GREEN,
                    loading: isStatsLoading,
                },
            ];
        }
        return defaultStats.map((stat) => ({
            ...stat,
            loading: isStatsLoading,
        }));
    };

    // Get consumption data based on selected time range
    const getConsumptionData = () => {
        if (consumptionTimeRange === "Daily") {
            if (
                consumptionAnalyticsData &&
                consumptionAnalyticsData.xAxisData
            ) {
                const data = {
                    xAxisData: consumptionAnalyticsData.xAxisData || [],
                    seriesData: consumptionAnalyticsData.seriesData || [
                        { name: "Consumption", data: [] },
                    ],
                };

                return data;
            }
        } else if (consumptionTimeRange === "Monthly") {
            if (consumptionAnalyticsData && consumptionAnalyticsData.monthly) {
                const data = {
                    xAxisData: consumptionAnalyticsData.monthly.xAxisData || [],
                    seriesData: consumptionAnalyticsData.monthly.seriesData || [
                        { name: "Consumption", data: [] },
                    ],
                };

                return data;
            }
        }

        return {
            xAxisData: [],
            seriesData: [{ name: "Consumption", data: [] }],
        };
    };

    // Get KVA metrics data based on selected time range
    // const getKvaMetricsData = () => {
    //   if (kvaTimeRange === "Daily") {
    //     if (kvaMetricsData && kvaMetricsData.dailyData) {
    //       const data = {
    //         xAxisData: kvaMetricsData.dailyData.xAxisData || [],
    //         seriesData: [
    //           {
    //             name: "kVA",
    //             data:
    //               kvaMetricsData.dailyData.sums?.map((sum: string) =>
    //                 parseFloat(sum)
    //               ) || [],
    //           },
    //         ],
    //       };
    //       return data;
    //     }
    //   } else if (kvaTimeRange === "Monthly") {
    //     if (kvaMetricsData && kvaMetricsData.monthlyData) {
    //       const data = {
    //         xAxisData: kvaMetricsData.monthlyData.xAxisData || [],
    //         seriesData: [
    //           {
    //             name: "kVA",
    //             data:
    //               kvaMetricsData.monthlyData.sums?.map((sum: string) =>
    //                 parseFloat(sum)
    //               ) || [],
    //           },
    //         ],
    //       };
    //       return data;
    //     }
    //   }

    //   return {
    //     xAxisData: [],
    //     seriesData: [{ name: "kVA", data: [] }],
    //   };
    // };

    // Retry functions for each API - Commented out as not currently used
    /*
    const retryStatsAPI = async () => {
        setIsStatsLoading(true);
        try {
            const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
            if (!numericDtrId) return;

            const meterIdentifier = passedData?.feederId || passedData?.feederData?.feederName || feederId || '';
            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}/instantaneousStats`;
            if (meterIdentifier) {
                const qp = new URLSearchParams({ feederId: meterIdentifier });
                endpoint = `${endpoint}?${qp.toString()}`;
            }

            const response = await fetch(endpoint);
            if (!response.ok) throw new Error('Failed to fetch instantaneous stats');

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format');
            }

            const data = await response.json();
            if (data.success) {


                // If we have specific feeder data, we might need to adjust the data
                let apiData = {
                    ...data.data,
                    lastCommDate: data.data.lastCommDate || null
                };


                setInstantaneousStatsData(apiData);
                setFailedApis(prev => prev.filter(api => api.id !== 'instantaneousStats'));
            } else {
                throw new Error(data.message || 'Failed to fetch instantaneous stats');
            }
        } catch (err: any) {
            setInstantaneousStatsData(dummyInstantaneousStatsData);
        } finally {
            setTimeout(() => {
                setIsStatsLoading(false);
            }, 1000);
        }
    };

    const retryConsumptionAPI = async () => {
        setIsConsumptionLoading(true);
        try {
            const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
            if (!numericDtrId) return;

            const meterIdentifier = passedData?.feederId || passedData?.feederData?.feederName || feederId || '';
            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}/consumptionAnalytics`;
            if (meterIdentifier) {
                const qp = new URLSearchParams({ feederId: meterIdentifier });
                endpoint = `${endpoint}?${qp.toString()}`;
            }
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error('Failed to fetch consumption analytics');

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format');
            }

            const data = await response.json();
            if (data.status === 'success') {
                let transformedData = {
                    xAxisData: data.data.dailyData?.xAxisData || [],
                    seriesData: [{
                        name: 'Consumption',
                        data: data.data.dailyData?.sums?.map((sum: string) => parseFloat(sum)) || []
                    }],
                    monthly: {
                        xAxisData: data.data.monthlyData?.xAxisData || [],
                        seriesData: [{
                            name: 'Consumption',
                            data: data.data.monthlyData?.sums?.map((sum: string) => parseFloat(sum)) || []
                        }]
                    }
                };



                setConsumptionAnalyticsData(transformedData);
                setFailedApis(prev => prev.filter(api => api.id !== 'consumptionAnalytics'));
            } else {
                throw new Error(data.message || 'Failed to fetch consumption analytics');
            }
        } catch (err: any) {
            setConsumptionAnalyticsData(dummyConsumptionAnalyticsData);
        } finally {
                setIsConsumptionLoading(false);
        }
    };

    const retryFeederInfoAPI = async () => {
        try {
            // Use resolved DTR ID
            let numericDtrId = resolvedDtrId;

            if (!numericDtrId) {
                console.warn('retryFeederInfoAPI - No DTR ID available');
                return;
            }

            const meterIdentifier = passedData?.feederId || effectiveFeederData?.feederName || feederId || '';
            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}`;
            if (meterIdentifier) {
                const qp = new URLSearchParams({ feederId: meterIdentifier });
                endpoint = `${endpoint}?${qp.toString()}`;
            }

            const response = await fetch(endpoint);
            if (!response.ok) throw new Error('Failed to fetch feeder information');

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format');
            }

            const data = await response.json();
            if (data.success) {
                let feederInfo = data.data;

                // If this is for a specific feeder, we need to filter the data
                if (effectiveFeederData?.feederName) {
                    const feederName = effectiveFeederData.feederName;


                    // Find the specific feeder in the DTR's feeders list
                    const specificFeeder = feederInfo.feeders?.find((feeder: any) =>
                        feeder.serialNumber === feederName ||
                        feeder.meterNumber === feederName
                    );

                    if (specificFeeder) {

                        // Create feeder-specific info
                        feederInfo = {
                            dtr: feederInfo.dtr,
                            totalFeeders: 1, // This is now for a specific feeder
                            specificFeeder: {
                                serialNumber: specificFeeder.serialNumber,
                                meterNumber: specificFeeder.meterNumber,
                                manufacturer: specificFeeder.manufacturer,
                                model: specificFeeder.model,
                                type: specificFeeder.type,
                                phase: specificFeeder.phase,
                                status: specificFeeder.status,
                                location: specificFeeder.location,
                                city: specificFeeder.city
                            }
                        };
                    } else {
                        console.warn('retryFeederInfoAPI - Specific feeder not found in DTR data');
                    }
                }

                setFeederInfoData(feederInfo);
                setFailedApis(prev => prev.filter(api => api.id !== 'feederInfo'));
            } else {
                throw new Error(data.message || 'Failed to fetch feeder information');
            }
        } catch (err: any) {
            console.error("Error in Feeder Info API:", err);
            setFeederInfoData(dummyFeederInfoData);
        }
    };

    const retryAlertsAPI = async () => {
        setIsAlertsLoading(true);
        try {
            // Use resolved DTR ID
            let numericDtrId = resolvedDtrId;

            if (!numericDtrId) {
                console.warn('retryAlertsAPI - No DTR ID available');
                return;
            }

            const meterIdentifier = passedData?.feederId || effectiveFeederData?.feederName || feederId || '';
            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}/alerts`;
            if (meterIdentifier) {
                const qp = new URLSearchParams({ feederId: meterIdentifier });
                endpoint = `${endpoint}?${qp.toString()}`;
            }

            const response = await fetch(endpoint);
            const data = await response.json();


            if (data.success) {
                // Transform the data to ensure it matches the table column structure
                               // Backend now returns: { alertId: 'id', type: 'type', feederName: 'feederName', occuredOn: 'occuredOn' }
                // Just update the feederName if we have specific feeder data
                let transformedAlerts = data.data?.map((alert: any) => ({
                    ...alert,
                    feederName: effectiveFeederData?.feederName || alert.feederName || '-'
                })) || [];

                // If this is for a specific feeder, filter alerts for that feeder only
                if (effectiveFeederData?.feederName) {
                    const targetFeederName = effectiveFeederData.feederName;


                    // Since we're showing alerts for a specific feeder, we'll show all alerts
                    // but mark them as belonging to this feeder
                    transformedAlerts = transformedAlerts.map((alert: any) => ({
                        ...alert,
                        feederName: targetFeederName
                    }));


                }


                setAlertsData(transformedAlerts);
                setFailedApis(prev => prev.filter(api => api.id !== 'alerts'));
            } else {
                throw new Error(data.message || 'Failed to fetch alerts');
            }
        } catch (err: any) {
            console.error("Error in Alerts API:", err);
            setAlertsData(dummyAlertsData);
        } finally {
                setIsAlertsLoading(false);
        }
    };

    const retryKVAMetricsAPI = async () => {
        setIsKvaMetricsLoading(true);
        try {
            // Use resolved DTR ID
            let numericDtrId = resolvedDtrId;

            if (!numericDtrId) {
                console.warn('retryKVAMetricsAPI - No DTR ID available');
                return;
            }

            const meterIdentifier = passedData?.feederId || effectiveFeederData?.feederName || feederId || '';
            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}/kvaMetrics`;
            if (meterIdentifier) {
                const qp = new URLSearchParams({ feederId: meterIdentifier });
                endpoint = `${endpoint}?${qp.toString()}`;
            }

            const response = await fetch(endpoint);
            const data = await response.json();


            if (data.status === 'success') {
                let transformedData = {
                    xAxisData: data.data?.dailyData?.xAxisData || [],
                    seriesData: [{
                        name: 'kVA',
                        data: data.data?.dailyData?.sums?.map((sum: string) => parseFloat(sum)) || []
                    }],
                    monthly: {
                        xAxisData: data.data?.monthlyData?.xAxisData || [],
                        seriesData: [{
                            name: 'kVA',
                            data: data.data?.monthlyData?.sums?.map((sum: string) => parseFloat(sum)) || []
                        }]
                    }
                };

                // If this is for a specific feeder, we might need to adjust the data
                if (effectiveFeederData?.feederName) {

                }

                // setKvaMetricsData removed - not used in active code
                setFailedApis(prev => prev.filter(api => api.id !== 'kvaMetrics'));
            } else {
                throw new Error(data.message || 'Failed to fetch KVA metrics');
            }
        } catch (err: any) {
            console.error("Error in KVA Metrics API:", err);
            // setKvaMetricsData removed - not used in active code
        } finally {
                setIsKvaMetricsLoading(false);
        }
    };
    */

    // Retry specific API
    const retrySpecificAPI = (apiId: string) => {
        const api = failedApis.find((a) => a.id === apiId);
        if (api) {
            api.retryFunction();
        }
    };

    // Effect to update resolvedDtrId when effectiveDtrId changes
    useEffect(() => {
        if (effectiveDtrId && effectiveDtrId !== resolvedDtrId) {
            console.log(
                "Updating resolvedDtrId from effectiveDtrId:",
                effectiveDtrId
            );
            setResolvedDtrId(effectiveDtrId);
        }
    }, [effectiveDtrId]);

    // Effect to resolve DTR ID from feeder ID when needed
    useEffect(() => {
        const resolveDtrId = async () => {
            if (!resolvedDtrId && feederId) {
                console.log(
                    "useEffect - resolveDtrId - Looking for DTR ID for feeder:",
                    feederId
                );
                const foundDtrId = await findDtrIdFromFeederId(feederId);
                if (foundDtrId) {
                    console.log(
                        "useEffect - resolveDtrId - Found DTR ID:",
                        foundDtrId
                    );
                    setResolvedDtrId(foundDtrId);
                } else {
                    console.warn(
                        "useEffect - resolveDtrId - Could not find DTR ID for feeder:",
                        feederId
                    );
                }
            }
        };

        resolveDtrId();
    }, [feederId, resolvedDtrId]);

    // Effect to log time range changes for debugging
    // useEffect(() => {}, [consumptionTimeRange, kvaTimeRange]);

    // Load data on component mount
    useEffect(() => {
        console.log(
            "Main data loading useEffect - resolvedDtrId:",
            resolvedDtrId,
            "dtrId:",
            dtrId,
            "feederId:",
            feederId
        );

        // Only proceed if we have a resolved DTR ID or if we're not looking for individual feeder data
        if (!resolvedDtrId && feederId) {
            console.log("Skipping data fetch - no resolved DTR ID for feeder");
            return;
        }

        if (resolvedDtrId || dtrId) {
            console.log(
                "Starting data fetch with DTR ID:",
                resolvedDtrId || dtrId
            );
            fetchInstantaneousStats();
            fetchConsumptionAnalytics();
            fetchFeederInfo();
            fetchAlerts();
            fetchKVAMetrics();
        } else {
            console.log("No DTR ID available for data fetch");
        }
    }, [resolvedDtrId, dtrId]);

    // Effect to update map coordinates when feeder info changes
    useEffect(() => {
        if (
            feederInfoData &&
            feederInfoData.feeders &&
            feederInfoData.feeders.length > 0
        ) {
            const firstFeeder = feederInfoData.feeders[0];
            if (firstFeeder.latitude && firstFeeder.longitude) {
                setMapLatitude(firstFeeder.latitude);
                setMapLongitude(firstFeeder.longitude);
            }
        }
    }, [feederInfoData]);

    // Effect to log coordinate changes for debugging
    useEffect(() => {}, [mapLatitude, mapLongitude]);

    // Enhanced data for Alerts Table with more entries
    const [_feederData, _setFeederData] = useState([
        { title: "Feeder Name", description: "D1F1(32500114)" },
        { title: "Rating", description: "25.00 kVA" },
        {
            title: "Address",
            description: "Waddepally, Warangal, Telangana, India, 506001",
        },
    ]);

    // Handle Excel download for daily consumption chart (legacy function - keeping for backward compatibility)
    // const handleDailyChartDownload = () => {
    //   // Use KVA metrics data if available, otherwise use empty data
    //   const xAxisData = kvaMetricsData.xAxisData || [];
    //   const seriesData = kvaMetricsData.seriesData || [{ name: "kVA", data: [] }];
    //   exportChartData(xAxisData, seriesData, "feeder-kva-metrics-data");
    // };

    // Handle Excel download for consumption chart based on current time range
    const handleConsumptionChartDownload = () => {
        const data = getConsumptionData();
        const timeRange = consumptionTimeRange.toLowerCase();
        exportChartData(
            data.xAxisData,
            data.seriesData,
            `feeder-${timeRange}-consumption-data`
        );
    };

    // Handle Excel download for KVA metrics chart based on current time range
    // const handleKvaMetricsChartDownload = () => {
    //   const data = getKvaMetricsData();
    //   const timeRange = kvaTimeRange.toLowerCase();
    //   exportChartData(
    //     data.xAxisData,
    //     data.seriesData,
    //     `feeder-${timeRange}-kva-metrics-data`
    //   );
    // };

    // Debug: Log failedApis state

    // Function to calculate optimal map center and zoom for multiple feeders
    // const getMapCenterAndZoom = () => {
    //   if (feederInfoData?.feeders && feederInfoData.feeders.length > 1) {
    //     // Calculate bounds for multiple feeders
    //     const lats = feederInfoData.feeders
    //       .map((feeder: any) => feeder.latitude)
    //       .filter(Boolean);
    //     const lngs = feederInfoData.feeders
    //       .map((feeder: any) => feeder.longitude)
    //       .filter(Boolean);

    //     if (lats.length > 0 && lngs.length > 0) {
    //       const minLat = Math.min(...lats);
    //       const maxLat = Math.max(...lats);
    //       const minLng = Math.min(...lngs);
    //       const maxLng = Math.max(...lngs);

    //       const centerLat = (minLat + maxLat) / 2;
    //       const centerLng = (minLng + maxLng) / 2;

    //       // Calculate zoom based on the span of coordinates
    //       const latSpan = maxLat - minLat;
    //       const lngSpan = maxLng - minLng;
    //       const maxSpan = Math.max(latSpan, lngSpan);

    //       let zoom = 13;
    //       if (maxSpan > 0.1) zoom = 10;
    //       else if (maxSpan > 0.05) zoom = 11;
    //       else if (maxSpan > 0.01) zoom = 12;
    //       else if (maxSpan > 0.005) zoom = 14;
    //       else if (maxSpan > 0.001) zoom = 15;

    //       return { center: { lat: centerLat, lng: centerLng }, zoom };
    //     }
    //   }

    //   // Default center and zoom for single feeder or fallback
    //   return { center: { lat: mapLatitude, lng: mapLongitude }, zoom: 13 };
    // };

    //   const { center: mapCenter, zoom: mapZoom } = getMapCenterAndZoom();

    return (
        <div className=" sticky top-0 ">
            <Page
                sections={[
                    // Error Section - Above PageHeader
                    ...(failedApis.length > 0
                        ? [
                              {
                                  layout: {
                                      type: "column" as const,
                                      gap: "gap-4",
                                      rows: [
                                          {
                                              layout: "column" as const,
                                              columns: [
                                                  {
                                                      name: "Error",
                                                      props: {
                                                          visibleErrors:
                                                              failedApis.map(
                                                                  (api) =>
                                                                      api.errorMessage
                                                              ),
                                                          showRetry: true,
                                                          maxVisibleErrors: 3,
                                                          failedApis:
                                                              failedApis,
                                                          onRetrySpecific:
                                                              retrySpecificAPI,
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
                            type: "grid" as const,
                            columns: 1,
                            className: "w-full",
                            rows: [
                                {
                                    layout: "row" as const,
                                    className: "w-full",
                                    columns: [
                                        {
                                            name: "PageHeader",
                                            props: {
                                                title: isIndividualFeeder
                                                    ? `Feeder ${
                                                          feederData?.feederName ||
                                                          currentFeederId
                                                      }`
                                                    : effectiveFeederData?.feederName
                                                    ? `Feeder ${effectiveFeederData.feederName}`
                                                    : "Feeder Information",
                                                onBackClick: () => {
                                                    if (isIndividualFeeder) {
                                                        // Go back to the specific DTR detail page if we have the DTR ID
                                                        if (passedData?.dtrId) {
                                                            navigate(
                                                                `/dtr-detail/${passedData.dtrId}`
                                                            );
                                                        } else {
                                                            navigate(
                                                                "/dtr-dashboard"
                                                            );
                                                        }
                                                    } else {
                                                        window.history.back();
                                                    }
                                                },
                                                // backButtonText: isIndividualFeeder
                                                //   ? passedData?.dtrName
                                                //     ? `Back to ${passedData.dtrName}`
                                                //     : "Back to DTR Dashboard"
                                                //   : "Back to Dashboard",
                                                // buttonsLabel: "Export Data",
                                                // variant: "primary",
                                                // onClick: () => handleExportData(),
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        layout: {
                            type: "grid" as const,
                            columns: 3,
                            className:
                                "border border-primary-border dark:border-dark-border rounded-3xl bg-white p-4 dark:bg-primary-dark-light",
                            rows: [
                                {
                                    layout: "row" as const,
                                    className: "justify-between w-full",
                                    span: { col: 3, row: 1 },
                                    columns: [
                                        {
                                            name: "SectionHeader",
                                            props: {
                                                title: isIndividualFeeder
                                                    ? `Feeder ${
                                                          feederData?.feederName ||
                                                          currentFeederId
                                                      } Information`
                                                    : effectiveFeederData?.feederName
                                                    ? `Feeder ${effectiveFeederData.feederName} Information`
                                                    : "DTR Information",
                                                titleLevel: 2,
                                                titleSize: "md",
                                                titleVariant: "",
                                                titleWeight: "bold",
                                                titleAlign: "left",
                                                defaultTitleHeight: "0",
                                                className:
                                                    "w-full justify-between",
                                                // rightComponent: {
                                                //     name: 'LastComm',

                                                //     props: {
                                                //         lastSync: true,
                                                //         internalIcon: 'icons/feeder.svg',
                                                //         internalValue: isIndividualFeeder ? `Feeder ${feederData?.feederName || currentFeederId}` : 'DTR Feeders',
                                                //         internalTitle: 'Feeder',
                                                //         delayedIcon: 'icons/power-factor.svg',
                                                //         delayedValue: feederInfoData?.dtr?.status || 'ACTIVE',
                                                //         delayedTitle: 'Status',
                                                //         dateIcon: 'icons/consumption.svg',
                                                //         dateValue: `${feederInfoData?.dtr?.capacity || 100} kVA`,
                                                //         dateTitle: 'Capacity'
                                                //     }
                                                // },
                                            },
                                        },
                                    ],
                                },
                                {
                                    layout: "row" as const,
                                    className: "justify-between w-full",
                                    span: { col: 3, row: 1 },
                                    columns: [
                                        {
                                            name: "PageInformation",
                                            props: {
                                                gridColumns: 4,
                                                rows: [
                                                    {
                                                        layout: "row",
                                                        className:
                                                            "justify-between w-full",
                                                        span: {
                                                            col: 3,
                                                            row: 1,
                                                        },
                                                        items: [
                                                            {
                                                                title: "DTR Number",
                                                                value:
                                                                    feederInfoData
                                                                        ?.dtr
                                                                        ?.dtrNumber ||
                                                                    "DTR-007",
                                                                align: "start",
                                                                gap: "gap-1",
                                                            },
                                                            {
                                                                title: "DTR Capacity",
                                                                value: `${
                                                                    feederInfoData
                                                                        ?.dtr
                                                                        ?.capacity ||
                                                                    100
                                                                } kVA`,
                                                                align: "start",
                                                                gap: "gap-1",
                                                                // progressBar: true,
                                                                // currentValue: 75,
                                                                // maxValue: feederInfoData?.dtr?.capacity || 100,
                                                                // progressColor: 'bg-secondary from-primary to-secondary'
                                                            },
                                                            {
                                                                title: "Feeder Capacity",
                                                                value: (() => {
                                                                    const dtrCapacity =
                                                                        feederInfoData
                                                                            ?.dtr
                                                                            ?.capacity ||
                                                                        100;
                                                                    const totalFeeders =
                                                                        feederInfoData?.totalFeeders ||
                                                                        1;
                                                                    const feederCapacity =
                                                                        Math.round(
                                                                            dtrCapacity /
                                                                                totalFeeders
                                                                        );
                                                                    return `${feederCapacity} kVA`;
                                                                })(),
                                                                align: "start",
                                                                gap: "gap-1",
                                                            },
                                                            {
                                                                title: "Feeder Status",
                                                                value: (() => {
                                                                    // Use feeder status if available (for individual feeder), otherwise use DTR status
                                                                    const feederStatus =
                                                                        feederInfoData
                                                                            ?.specificFeeder
                                                                            ?.status ||
                                                                        feederInfoData
                                                                            ?.feeders?.[0]
                                                                            ?.status;
                                                                    return (
                                                                        feederStatus ||
                                                                        feederInfoData
                                                                            ?.dtr
                                                                            ?.status ||
                                                                        "ACTIVE"
                                                                    );
                                                                })(),
                                                                align: "start",
                                                                gap: "gap-1",
                                                                statusIndicator:
                                                                    true,
                                                                statusType:
                                                                    (() => {
                                                                        const feederStatus =
                                                                            feederInfoData
                                                                                ?.specificFeeder
                                                                                ?.status ||
                                                                            feederInfoData
                                                                                ?.feeders?.[0]
                                                                                ?.status;
                                                                        return (
                                                                            feederStatus ||
                                                                            feederInfoData
                                                                                ?.dtr
                                                                                ?.status
                                                                        );
                                                                    })(),
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
                            type: "grid" as const,
                            columns: 1,
                            className:
                                "w-full p-4 border border-primary-border dark:border-dark-border rounded-3xl dark:bg-primary-dark-light",
                            rows: [
                                {
                                    layout: "row" as const,
                                    className: "justify-between w-full",
                                    span: { col: 1, row: 1 },
                                    columns: [
                                        {
                                            name: "SectionHeader",
                                            props: {
                                                title: isIndividualFeeder
                                                    ? `Feeder ${
                                                          feederData?.feederName ||
                                                          currentFeederId
                                                      } Information`
                                                    : effectiveFeederData?.feederName
                                                    ? `Feeder ${effectiveFeederData.feederName} Information`
                                                    : "Instantaneous Stats",
                                                titleLevel: 2,
                                                titleSize: "md",
                                                titleVariant: "",
                                                titleWeight: "bold",
                                                titleAlign: "left",
                                                className:
                                                    "w-full justify-between",
                                                // rightComponent: { name: 'LastComm', props: {
                                                //     value: (() => {
                                                //         const lastComm = instantaneousStatsData?.lastCommDate;

                                                //         if (lastComm && lastComm !== '-' && lastComm !== null) {
                                                //             try {
                                                //                 const date = new Date(lastComm);
                                                //                 if (!isNaN(date.getTime())) {
                                                //                     return date.toLocaleString('en-IN', {
                                                //                         year: 'numeric',
                                                //                         month: '2-digit',
                                                //                         day: '2-digit',
                                                //                         hour: '2-digit',
                                                //                         minute: '2-digit',
                                                //                         second: '2-digit',
                                                //                         hour12: false
                                                //                     });
                                                //                 } else {
                                                //                     console.warn('Invalid date from lastCommDate:', lastComm);
                                                //                     return `Raw: ${lastComm}`;
                                                //                 }
                                                //             } catch (error) {
                                                //                 console.error('Error parsing lastCommDate:', error);
                                                //                 return `Raw: ${lastComm}`;
                                                //             }
                                                //         }
                                                //         return '2024-01-15 14:30:00';
                                                //     })()
                                                // } },
                                                rightComponent: {
                                                    name: "LastComm",
                                                    props: {
                                                        label: "Last Communication",
                                                        labelVariant: "",
                                                        value: (() => {
                                                            const raw =
                                                                instantaneousStatsData?.lastCommDate;
                                                            if (
                                                                !raw ||
                                                                typeof raw !==
                                                                    "string"
                                                            ) {
                                                                return "N/A";
                                                            }
                                                            try {
                                                                // Try to parse robustly: handle both "YYYY-MM-DD HH:mm:ss" and ISO forms
                                                                const parseSource =
                                                                    raw.includes(
                                                                        "T"
                                                                    )
                                                                        ? raw
                                                                        : raw.replace(
                                                                              " ",
                                                                              "T"
                                                                          );
                                                                const d =
                                                                    new Date(
                                                                        parseSource
                                                                    );
                                                                if (
                                                                    !isNaN(
                                                                        d.getTime()
                                                                    )
                                                                ) {
                                                                    return d.toLocaleString(
                                                                        "en-IN",
                                                                        {
                                                                            year: "numeric",
                                                                            month: "2-digit",
                                                                            day: "2-digit",
                                                                            hour: "2-digit",
                                                                            minute: "2-digit",
                                                                            second: "2-digit",
                                                                            hour12: true,
                                                                        }
                                                                    );
                                                                }
                                                                // If parsing fails, fall back to raw
                                                                return raw;
                                                            } catch {
                                                                return raw;
                                                            }
                                                        })(),
                                                    },
                                                },
                                            },
                                            span: { col: 1, row: 1 },
                                        },
                                    ],
                                },
                                {
                                    layout: "grid" as const,
                                    gridColumns: 5,
                                    className: "w-full gap-4",
                                    columns: getStats().map((stat: any) => ({
                                        name: "Card",
                                        props: {
                                            title: stat.title,
                                            value: stat.value,
                                            subtitle1: stat.subtitle1,
                                            icon: stat.icon,
                                            bg: stat.bg,
                                            iconClassName:
                                                stat.iconClassName || "w-4 h-4",
                                            iconStyle:
                                                stat.iconStyle ||
                                                FILTER_STYLES.WHITE,
                                            width: stat.width || "w-8",
                                            height: stat.height || "h-8",
                                            valueFontSize:
                                                stat.valueFontSize ||
                                                "text-lg lg:text-xl md:text-lg sm:text-base",
                                            loading: stat.loading,
                                        },
                                        span: { col: 1, row: 1 },
                                    })),
                                },
                            ],
                        },
                    },

                    {
                        layout: {
                            type: "grid" as const,
                            columns: 1,
                            rows: [
                                {
                                    layout: "grid" as const,
                                    className: "w-full",
                                    columns: [
                                        {
                                            name: "VectorTest",
                                            props: {
                                                showHeader: true,
                                                showDownloadButton: true,
                                                headerTitle:
                                                    "Feeder Vector Diagram",
                                                vrValue: parseFloat(
                                                    instantaneousStatsData.rphVolt ||
                                                        "0"
                                                ),
                                                vbValue: parseFloat(
                                                    instantaneousStatsData.bphVolt ||
                                                        "0"
                                                ),
                                                vyValue: parseFloat(
                                                    instantaneousStatsData.yphVolt ||
                                                        "0"
                                                ),
                                                useCustomDashedAngles: true,
                                                customDashedVrAngle:
                                                    calculatePowerFactorAngle(
                                                        instantaneousStatsData.rphPF ||
                                                            "0"
                                                    ),
                                                customDashedVbAngle:
                                                    calculatePowerFactorAngle(
                                                        instantaneousStatsData.bphPF ||
                                                            "0"
                                                    ),
                                                customDashedVyAngle:
                                                    calculatePowerFactorAngle(
                                                        instantaneousStatsData.yphPF ||
                                                            "0"
                                                    ),
                                                statsSectionPosition: "right",
                                                autoSize: true,
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        layout: {
                            type: "grid" as const,
                            columns: 1,
                            rows: [
                                {
                                    layout: "grid" as const,
                                    className: "w-full",
                                    columns: [
                                        {
                                            name: "BarChart",
                                            props: {
                                                xAxisData:
                                                    getConsumptionData()
                                                        .xAxisData,
                                                seriesData:
                                                    getConsumptionData()
                                                        .seriesData,
                                                seriesColors: [
                                                    "#163b7c",
                                                    "#55b56c",
                                                ], // Force brand colors
                                                height: 320,
                                                showHeader: true,
                                                headerTitle: `${consumptionTimeRange} Consumption Metrics Bar Chart`,
                                                className: "w-full",
                                                dateRange: "Last 30 days",
                                                availableTimeRanges: [
                                                    "Daily",
                                                    "Monthly",
                                                ],
                                                initialTimeRange:
                                                    consumptionTimeRange,
                                                onTimeRangeChange: (
                                                    range: string
                                                ) => {
                                                    setConsumptionTimeRange(
                                                        range as
                                                            | "Daily"
                                                            | "Monthly"
                                                    );
                                                },
                                                showDownloadButton: true,
                                                onDownload: () =>
                                                    handleConsumptionChartDownload(),
                                                showXAxisLabel: true,
                                                xAxisLabel: "kWh",
                                                isLoading: isConsumptionLoading,
                                                onBarClick: (clickData: {
                                                    date: string;
                                                    value: number;
                                                    seriesName: string;
                                                    timeRange: string;
                                                }) => {
                                                    console.log(
                                                        "📊 Bar Chart Clicked in TGNPDCL Feeders:",
                                                        clickData
                                                    );
                                                    // Open modal with the clicked day's total value as a single-point line series
                                                    handleModalOpen({
                                                        date: clickData.date,
                                                        value: clickData.value,
                                                        seriesName:
                                                            clickData.seriesName,
                                                        timeRange:
                                                            clickData.timeRange,
                                                        lineData: [
                                                            clickData.value,
                                                        ],
                                                        lineXAxis: [
                                                            clickData.date,
                                                        ],
                                                        headerTitle: `${clickData.seriesName} - Daily Total`,
                                                    });
                                                },
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    //   {
                    //     layout: {
                    //       type: "grid" as const,
                    //       columns: 1,
                    //       className: "",
                    //       rows: [
                    //         {
                    //           layout: "grid" as const,
                    //           className: "w-full",
                    //           columns: [
                    //             {
                    //               name: "GoogleMap",
                    //               props: {
                    //                 title: "Feeder Location",
                    //                 hasDownload: true,
                    //                 apiKey: "AIzaSyCzGAzUjgicpxShXVusiguSnosdmsdQ7WI",
                    //                 center: mapCenter,
                    //                 zoom: mapZoom,
                    //                 libraries: ["places"],
                    //                 markers: (() => {
                    //                   // If we have specific feeder data, show only that feeder
                    //                   if (feederInfoData?.specificFeeder) {
                    //                     return [
                    //                       {
                    //                         position: {
                    //                           lat:
                    //                             feederInfoData.specificFeeder.latitude ||
                    //                             mapLatitude,
                    //                           lng:
                    //                             feederInfoData.specificFeeder.longitude ||
                    //                             mapLongitude,
                    //                         },
                    //                         title: `Feeder: ${
                    //                           feederInfoData.specificFeeder.meterNumber ||
                    //                           feederInfoData.specificFeeder.serialNumber
                    //                         }`,
                    //                         infoContent: `<div><strong>Feeder Location</strong><br/>Meter: ${
                    //                           feederInfoData.specificFeeder.meterNumber ||
                    //                           "N/A"
                    //                         }<br/>Serial: ${
                    //                           feederInfoData.specificFeeder.serialNumber ||
                    //                           "N/A"
                    //                         }<br/>Manufacturer: ${
                    //                           feederInfoData.specificFeeder.manufacturer ||
                    //                           "N/A"
                    //                         }<br/>Model: ${
                    //                           feederInfoData.specificFeeder.model || "N/A"
                    //                         }<br/>Type: ${
                    //                           feederInfoData.specificFeeder.type || "N/A"
                    //                         }<br/>Phase: ${
                    //                           feederInfoData.specificFeeder.phase || "N/A"
                    //                         }<br/>Status: ${
                    //                           feederInfoData.specificFeeder.status || "N/A"
                    //                         }<br/>Location: ${
                    //                           feederInfoData.specificFeeder.location ||
                    //                           "N/A"
                    //                         }<br/>Coordinates: ${
                    //                           feederInfoData.specificFeeder.latitude ||
                    //                           mapLatitude
                    //                         }, ${
                    //                           feederInfoData.specificFeeder.longitude ||
                    //                           mapLongitude
                    //                         }</div>`,
                    //                       },
                    //                     ];
                    //                   }

                    //                   // If we have multiple feeders, show all of them
                    //                   if (
                    //                     feederInfoData?.feeders &&
                    //                     feederInfoData.feeders.length > 0
                    //                   ) {
                    //                     return feederInfoData.feeders.map(
                    //                       (feeder: any, index: number) => ({
                    //                         position: {
                    //                           lat: feeder.latitude || mapLatitude,
                    //                           lng: feeder.longitude || mapLongitude,
                    //                         },
                    //                         title: `Feeder ${index + 1}: ${
                    //                           feeder.meterNumber || feeder.serialNumber
                    //                         }`,
                    //                         infoContent: `<div><strong>Feeder ${
                    //                           index + 1
                    //                         }</strong><br/>Meter: ${
                    //                           feeder.meterNumber || "N/A"
                    //                         }<br/>Serial: ${
                    //                           feeder.serialNumber || "N/A"
                    //                         }<br/>Manufacturer: ${
                    //                           feeder.manufacturer || "N/A"
                    //                         }<br/>Model: ${
                    //                           feeder.model || "N/A"
                    //                         }<br/>Type: ${
                    //                           feeder.type || "N/A"
                    //                         }<br/>Phase: ${
                    //                           feeder.phase || "N/A"
                    //                         }<br/>Status: ${
                    //                           feeder.status || "N/A"
                    //                         }<br/>Location: ${
                    //                           feeder.location || "N/A"
                    //                         }<br/>Coordinates: ${
                    //                           feeder.latitude || mapLatitude
                    //                         }, ${feeder.longitude || mapLongitude}</div>`,
                    //                       })
                    //                     );
                    //                   }

                    //                   // Fallback to single marker at center
                    //                   return [
                    //                     {
                    //                       position: { lat: mapLatitude, lng: mapLongitude },
                    //                       title: "Feeder Location",
                    //                       infoContent: `<div><strong>Feeder Location</strong><br/>Coordinates: ${mapLatitude}, ${mapLongitude}</div>`,
                    //                     },
                    //                   ];
                    //                 })(),
                    //                 mapOptions: {
                    //                   disableDefaultUI: false,
                    //                   zoomControl: true,
                    //                   mapTypeControl: true,
                    //                   scaleControl: true,
                    //                   streetViewControl: true,
                    //                   rotateControl: true,
                    //                   fullscreenControl: true,
                    //                 },
                    //                 onReady: (_map: any, _google: any) => {},
                    //                 onClick: (e: any) => {
                    //                   const clickedCoords = e.latLng?.toJSON();
                    //                   if (clickedCoords) {
                    //                     // You could add a temporary marker here or show coordinates in a tooltip
                    //                   }
                    //                 },
                    //                 onIdle: () => {},
                    //               },
                    //             },
                    //           ],
                    //         },
                    //       ],
                    //     },
                    //   },
                    {
                        // layout: {
                        //     type: 'grid' as const,
                        //     columns: 1,
                        //     rows: [
                        //         {
                        //             layout: 'grid' as const,
                        //             gridColumns:1,
                        //             columns: [
                        //                 {
                        //                     name: 'BarChart',
                        //                     props: {
                        //                         xAxisData: getKvaMetricsData().xAxisData,
                        //                         seriesData: getKvaMetricsData().seriesData,
                        //                         height: 320,
                        //                         ariaLabel: ' kVA Metrics Bar Chart',
                        //                         showHeader: true,
                        //                         handleDownload: handleDailyChartDownload,
                        //                         headerTitle: `${kvaTimeRange} kVA Metrics`,
                        //                         className: 'w-full',
                        //                         dateRange: 'Last 30 days',
                        //                         availableTimeRanges: ['Daily', 'Monthly',],
                        //                         initialTimeRange: kvaTimeRange,
                        //                         onTimeRangeChange: (range: string) => {
                        //                             setKvaTimeRange(range as 'Daily' | 'Monthly');
                        //                         },
                        //                         showDownloadButton: true,
                        //                         onDownload: () => handleKvaMetricsChartDownload(),
                        //                         showXAxisLabel: true,
                        //                         xAxisLabel: 'kVA',
                        //                         isLoading: isKvaMetricsLoading,
                        //                     },
                        //                     span: { col: 1, row: 1 },
                        //                 },
                        //             ],
                        //         },
                        //     ],
                        // },
                    },
                    //   {
                    //     layout: {
                    //       type: "grid" as const,
                    //       columns: 1,
                    //       className: "",
                    //       rows: [

                    //         {
                    //           layout: "grid" as const,
                    //           gridColumns: 1,
                    //           columns: [
                    //             {
                    //               name: "ThresholdChart",
                    //               props: {
                    //                 data: getKvaMetricsData().seriesData[0]?.data || [],
                    //                 threshold: kvaMetricsData.thresholdValue || 0,
                    //                 ratingKVA:
                    //                   kvaMetricsData.capacityInfo?.dtrCapacity || 50,
                    //                 title: `KVA Metrics - ${kvaTimeRange}`,
                    //                 chartType: "bar",
                    //                 availableTimeRanges: ["Daily", "Monthly"],
                    //                 selectedTimeRange: kvaTimeRange,
                    //                 onTimeRangeChange: (range: "Daily" | "Monthly") =>
                    //                   setKvaTimeRange(range),
                    //                 loading: isKvaMetricsLoading,
                    //                 highestKVA:
                    //                   kvaTimeRange === "Daily"
                    //                     ? kvaMetricsData.highestKVA?.daily
                    //                     : kvaMetricsData.highestKVA?.monthly,
                    //                 capacityInfo: kvaMetricsData.capacityInfo,
                    //                 xAxisData: getKvaMetricsData().xAxisData || [],
                    //                 showCapacityInfo: true,
                    //                 showHighestKVA: true,
                    //               },
                    //               span: { col: 1, row: 1 },
                    //             },
                    //           ],
                    //         },
                    //       ],
                    //     },
                    //   },

                    {
                        layout: {
                            type: "grid" as const,
                            columns: 1,
                            className: "",
                            rows: [
                                {
                                    layout: "grid" as const,
                                    gridColumns: 1,
                                    className: "pb-4",
                                    columns: [
                                        {
                                            name: "Table",
                                            props: {
                                                columns: [
                                                    {
                                                        key: "sNo",
                                                        label: "S.No",
                                                    },
                                                    // { key: "alertId", label: "Alert ID" },
                                                    {
                                                        key: "type",
                                                        label: "Event Type",
                                                    },
                                                    {
                                                        key: "feederName",
                                                        label: "Meter Number",
                                                    },
                                                    {
                                                        key: "occuredOn",
                                                        label: "Occured On",
                                                    },
                                                    {
                                                        key: "duration",
                                                        label: "Duration",
                                                    },
                                                    {
                                                        key: "status",
                                                        label: "Status",
                                                    },
                                                ],
                                                data: alertsData,
                                                searchable: true,
                                                pagination: true,
                                                initialRowsPerPage: 10,
                                                rowsPerPageOptions: [
                                                    5, 10, 15, 20, 25,
                                                ],
                                                emptyMessage: "No Alerts Found",
                                                showActions: false,
                                                showHeader: "true",
                                                headerTitle: "Alerts",
                                                showPaginationInfo: true,
                                                showRowsPerPageSelector: true,
                                                className: "w-full",
                                                loading: isAlertsLoading,
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    // Modal Section
                    {
                        layout: {
                            type: "column" as const,
                            gap: "gap-0",
                        },
                        components: [
                            {
                                name: "Modal",
                                props: {
                                    isOpen: isModalOpen,
                                    onClose: handleModalClose,
                                    title:
                                        modalData?.headerTitle &&
                                        modalData?.date
                                            ? `${modalData.headerTitle} (${modalData.date})`
                                            : modalData?.date
                                            ? `Daily Total (${modalData.date})`
                                            : "Feeder Consumption Details",
                                    size: "3xl",
                                    showCloseIcon: true,
                                    backdropClosable: true,
                                    centered: true,
                                    showPageC: true,
                                    pageCSections:
                                        isModalOpen && modalData
                                            ? [
                                                  {
                                                      layout: {
                                                          type: "column" as const,
                                                          gap: "gap-0",
                                                          className: "w-full",
                                                      },
                                                      components: [
                                                          {
                                                              name: "LineChart",
                                                              props: {
                                                                  title: "",
                                                                  data: (modalData &&
                                                                      modalData.lineData) || [
                                                                      150, 230,
                                                                      224, 218,
                                                                      135, 147,
                                                                      260,
                                                                  ],
                                                                  xAxisData:
                                                                      (modalData &&
                                                                          modalData.lineXAxis) || [
                                                                          "Mon",
                                                                          "Tue",
                                                                          "Wed",
                                                                          "Thu",
                                                                          "Fri",
                                                                          "Sat",
                                                                          "Sun",
                                                                      ],
                                                                  height: "500px",
                                                                  showXAxisLabel:
                                                                      true,
                                                                  showDownloadButton:
                                                                      true,
                                                                  isTimeFormat:
                                                                      false,
                                                                  showHeader:
                                                                      true,
                                                                  headerTitle:
                                                                      modalData &&
                                                                      modalData.seriesName
                                                                          ? `${modalData.seriesName} Trend`
                                                                          : "Feeder Metric Trend",
                                                                  dateRange:
                                                                      modalData &&
                                                                      modalData.date
                                                                          ? `(${modalData.date})`
                                                                          : "",
                                                                  availableTimeRanges:
                                                                      [],
                                                                  showViewToggle:
                                                                      false,
                                                                  isLoading:
                                                                      false,
                                                              },
                                                          },
                                                      ],
                                                  },
                                              ]
                                            : [],
                                },
                            },
                        ],
                    },
                ]}
            />
        </div>
    );
};

export default Feeders;
