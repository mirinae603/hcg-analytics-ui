import React, { useState, useEffect } from 'react';

// Static data dictionary
const REGION_DATA = {
    "demand_forecast":{
        "Bangalore":192012.0,
        "Chennai":32298.0,
        "Hyderabad East":566698.0,
        "Hyderabad West":139326.0,
        "Vijayawada":201468.0
    },
    "inventory_aging_risk":{
        "Bangalore":2968,
        "Chennai":1233,
        "Hyderabad East":297,
        "Hyderabad West":624,
        "Vijayawada":1408
    },
    "replenishment_quantity":{
        "Bangalore":38688.0,
        "Chennai":5770.0,
        "Hyderabad East":278935.0,
        "Hyderabad West":87281.0,
        "Vijayawada":14025.0
    },
    "safe_stock":{
        "Bangalore":27996.0,
        "Chennai":7587.0,
        "Hyderabad East":74014.0,
        "Hyderabad West":24196.0,
        "Vijayawada":33363.0
    },
    "stock_replenishment_prediction":{
        "Bangalore":204,
        "Chennai":131,
        "Hyderabad East":1049,
        "Hyderabad West":565,
        "Vijayawada":86
    },
    "count":{
        "Bangalore":4577,
        "Chennai":2977,
        "Hyderabad East":4517,
        "Hyderabad West":2278,
        "Vijayawada":3989
    }
} as const;

// Define the valid region type for internal use
type RegionKey = keyof typeof REGION_DATA.demand_forecast;

// Helper function to check if a string is a valid region
const isValidRegion = (region: string): region is RegionKey => {
  return region in REGION_DATA.demand_forecast;
};

export interface StockRadarCardProps {
  region: string; // Accept any string
  label?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  className?: string;
  animated?: boolean;
  // Optional real-data override (bypasses hardcoded REGION_DATA + region guard)
  metrics?: { stockOutMaterials: number; replenishmentQty: number; inventoryRisk: number; demandForecast: number; safeStock: number; totalStock: number };
}

const StockRadarCard: React.FC<StockRadarCardProps> = ({
  region,
  label = 'Stock Replenishment Radar',
  riskLevel = 'medium',
  className = '',
  animated = true,
  metrics
}) => {
  const hasData = !!metrics || isValidRegion(region);
  // Real-data override when provided, else region-specific data with fallbacks
  const stockOutMaterials = metrics ? metrics.stockOutMaterials : (isValidRegion(region) ? REGION_DATA.stock_replenishment_prediction[region] : 0);
  const replenishmentQty = Math.round(metrics ? metrics.replenishmentQty : (isValidRegion(region) ? REGION_DATA.replenishment_quantity[region] : 0));
  const inventoryRisk = metrics ? metrics.inventoryRisk : (isValidRegion(region) ? REGION_DATA.inventory_aging_risk[region] : 0);
  const demandForecast = Math.round(metrics ? metrics.demandForecast : (isValidRegion(region) ? REGION_DATA.demand_forecast[region] : 0));
  const safeStock = Math.round(metrics ? metrics.safeStock : (isValidRegion(region) ? REGION_DATA.safe_stock[region] : 0));
  const totalStock = Math.round(metrics ? metrics.totalStock : (isValidRegion(region) ? REGION_DATA.count[region] : 0));

  // Auto-determine risk level based on number of stockout materials
  const getAutoRiskLevel = (): 'low' | 'medium' | 'high' | 'critical' => {
    const stockouts = stockOutMaterials;
    if (stockouts <= 0.2*totalStock) return 'low';
    if (stockouts <= 0.4*totalStock) return 'medium';
    if (stockouts <= 0.6*totalStock) return 'high';
    return 'critical';
  };

  const finalRiskLevel = riskLevel === 'medium' ? getAutoRiskLevel() : riskLevel;

  const [sweepAngle, setSweepAngle] = useState(0);
  const [displayStockOuts, setDisplayStockOuts] = useState(animated ? 0 : stockOutMaterials);
  const [displayReplenishQty, setDisplayReplenishQty] = useState(animated ? 0 : replenishmentQty);
  const [detectedItems, setDetectedItems] = useState<Array<{id: number, angle: number, distance: number}>>([]);
  const [isHovered, setIsHovered] = useState(false);

  // Enhanced sweep animation with smooth easing
  useEffect(() => {
    if (!animated) return;
    
    const interval = setInterval(() => {
      setSweepAngle(prev => (prev + 1.5) % 360);
    }, 32);
    
    return () => clearInterval(interval);
  }, [animated]);

  // Generate radar blips based on stockout severity
  useEffect(() => {
    // Create more blips for higher stockout numbers, but cap at reasonable amount
    const blipCount = Math.min(Math.floor(stockOutMaterials / 100) + 3, 12);
    const items = Array.from({ length: blipCount }, (_, i) => ({
      id: i,
      angle: (i * (360 / blipCount) + Math.random() * 30) % 360,
      distance: 25 + Math.random() * 45,
    }));
    setDetectedItems(items);
  }, [stockOutMaterials, region]);

  // Smooth counter animation
  useEffect(() => {
    if (!animated) return;
    
    const duration = 1800;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      
      setDisplayStockOuts(stockOutMaterials * eased);
      setDisplayReplenishQty(replenishmentQty * eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [stockOutMaterials, replenishmentQty, animated]);

  const getRiskConfig = () => {
    const configs = {
      low: { color: '#10B981', bg: '#ECFDF5' },
      medium: { color: '#F59E0B', bg: '#FFFBEB' },
      high: { color: '#EF4444', bg: '#FEF2F2' },
      critical: { color: '#DC2626', bg: '#FEF2F2' }
    };
    return configs[finalRiskLevel];
  };

  const config = getRiskConfig();

  // Show error state for invalid regions (only when no real-data override is supplied)
  if (!hasData) {
    return (
      <div className="relative w-full max-w-lg mx-auto">
        <div className="relative w-full h-61 rounded-2xl overflow-hidden bg-red-50 border border-red-200 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-lg font-semibold mb-2">Invalid Region</div>
            <div className="text-red-400 text-sm">
              Region "{region}" not found. Valid regions: Bangalore, Chennai, Hyderabad East, Hyderabad West, Vijayawada
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <div
        className={`relative w-full h-61 rounded-2xl overflow-hidden transition-all duration-700 cursor-pointer backdrop-blur-lg ${
          isHovered ? 'shadow-md scale-[1.01]' : 'shadow-sm'
        } ${className}`}
        style={{
          background: `linear-gradient(135deg, ${config.bg} 0%, rgba(255,255,255,0.9) 100%)`,
          border: `0px solid rgba(255,255,255,0.3)`,
          backdropFilter: 'blur(20px)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Clean Header */}
        <div className="absolute top-0 left-0 right-0 h-20 p-5 flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-xs sm:text-sm lg:text-md font-bold text-gray-500 mb-2 leading-tight">
              {label} - {region}
            </h3>
            <div className="flex flex-col items-start space-y-1">
              <div className="flex items-baseline space-x-3">
                <span 
                  className="text-3xl font-semibold tracking-tight"
                  style={{ 
                    color: config.color,
                    textShadow: `0 2px 10px ${config.color}20`
                  }}
                >
                  {Math.round(displayStockOuts)}
                </span>
                <span className="text-sm text-slate-500 font-medium">
                  SKU's
                </span>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                Need to Replenish
              </span>
            </div>
          </div>
        
          <div
            className="px-3 py-1.5 rounded-xl text-xs font-medium backdrop-blur-sm transition-all duration-300 flex items-center"
            style={{
              background: `linear-gradient(135deg, ${config.color}06, ${config.color}10)`,
              color: config.color,
              border: `1px solid ${config.color}15`,
            }}
          >
            <div 
              className="w-1.5 h-1.5 rounded-full mr-2 animate-pulse"
              style={{ backgroundColor: config.color }}
            />
            {finalRiskLevel.toUpperCase()}
          </div>
        </div>

        {/* ENHANCED RADAR SECTION */}
        <div className="absolute top-20 left-0 right-0 h-26 flex items-center justify-center">
          <div className="relative w-40 h-40">
            
            {/* Multiple Radar Rings with Ripple Effect */}
            <div
              className="absolute inset-0 rounded-full border-2 opacity-25"
              style={{ 
                borderColor: config.color,
                animation: 'radar-pulse 4s ease-in-out infinite'
              }}
            />
            
            <div
              className="absolute top-2 left-2 right-2 bottom-2 rounded-full border opacity-20"
              style={{ 
                borderColor: config.color,
                animation: 'radar-pulse 4s ease-in-out infinite 1s'
              }}
            />
            
            <div
              className="absolute top-1/2 left-1/2 w-24 h-24 rounded-full border opacity-15 transform -translate-x-1/2 -translate-y-1/2"
              style={{ 
                borderColor: config.color,
                animation: 'radar-pulse 4s ease-in-out infinite 2s'
              }}
            />

            {/* Grid Lines for Authentic Radar Look */}
            <div 
              className="absolute top-1/2 left-0 right-0 h-px opacity-10"
              style={{ backgroundColor: config.color }}
            />
            <div 
              className="absolute top-0 bottom-0 left-1/2 w-px opacity-10"
              style={{ backgroundColor: config.color }}
            />
            
            {/* Main Radar Sweep Line with Enhanced Glow */}
            <div
              className="absolute top-1/2 left-1/2 origin-bottom"
              style={{
                width: '3px',
                height: '80px',
                background: `linear-gradient(to top, ${config.color} 0%, ${config.color}80 70%, transparent 100%)`,
                transform: `translate(-50%, -100%) rotate(${sweepAngle}deg)`,
                transformOrigin: 'bottom center',
                boxShadow: `0 0 20px ${config.color}60`,
                borderRadius: '2px'
              }}
            />
            
            {/* Sweep Trail Effect */}
            <div
              className="absolute top-1/2 left-1/2 origin-bottom pointer-events-none"
              style={{
                width: '80px',
                height: '80px',
                background: `conic-gradient(
                  from ${sweepAngle - 60}deg at center, 
                  transparent 0deg, 
                  ${config.color}03 15deg,
                  ${config.color}08 30deg,
                  ${config.color}15 45deg,
                  ${config.color}25 60deg,
                  transparent 75deg
                )`,
                transform: `translate(-50%, -100%)`,
                transformOrigin: 'bottom center',
                borderRadius: '50% 50% 0 0',
                filter: 'blur(1px)'
              }}
            />

            {/* Enhanced Sweep Glow */}
            <div
              className="absolute top-1/2 left-1/2 origin-bottom pointer-events-none opacity-60"
              style={{
                width: '60px',
                height: '80px',
                background: `conic-gradient(
                  from ${sweepAngle - 20}deg at center, 
                  transparent 0deg, 
                  ${config.color}20 10deg,
                  ${config.color}40 20deg,
                  transparent 30deg
                )`,
                transform: `translate(-50%, -100%)`,
                transformOrigin: 'bottom center',
                borderRadius: '50% 50% 0 0',
                filter: 'blur(2px)'
              }}
            />
            
            {/* Enhanced Blips with Sweep Detection */}
            {detectedItems.map(item => {
              const x = 50 + (item.distance * Math.cos(item.angle * Math.PI / 180)) / 2;
              const y = 50 + (item.distance * Math.sin(item.angle * Math.PI / 180)) / 2;
              
              const angleDiff = Math.abs(((item.angle - sweepAngle) + 360) % 360);
              const isInSweep = angleDiff < 40 || angleDiff > 320;
              const sweepIntensity = isInSweep ? 
                1 - Math.min(angleDiff > 180 ? 360 - angleDiff : angleDiff, 40) / 40 : 0;
              
              return (
                <div
                  key={item.id}
                  className="absolute transition-all duration-200"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {/* Blip Glow Ring */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      width: '12px',
                      height: '12px',
                      background: `radial-gradient(circle, ${config.color}40, transparent 70%)`,
                      opacity: sweepIntensity * 0.8,
                      transform: 'translate(-50%, -50%)',
                      animation: isInSweep ? 'blip-ping 1s ease-out' : 'none'
                    }}
                  />
                  
                  {/* Main Blip */}
                  <div
                    className="relative rounded-full"
                    style={{
                      width: '3px',
                      height: '3px',
                      backgroundColor: config.color,
                      opacity: 0.4 + (sweepIntensity * 0.6),
                      boxShadow: isInSweep ? `0 0 15px ${config.color}80` : `0 0 5px ${config.color}30`,
                      transform: `scale(${0.8 + sweepIntensity * 0.4})`
                    }}
                  />
                </div>
              );
            })}

            {/* Enhanced Center Hub with Pulsing */}
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              style={{
                animation: 'center-pulse 2s ease-in-out infinite'
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: config.color,
                  boxShadow: `0 0 15px ${config.color}80, inset 0 0 5px rgba(255,255,255,0.5)`
                }}
              />
            </div>
          </div>
        </div>

        {/* Clean Bottom Stats - Updated with meaningful labels */}
        <div className="absolute -bottom-3 left-0 right-0 h-24 p-4">
          <div 
            className="h-full flex justify-between items-center px-4 rounded-3xl backdrop-blur-md"
            style={{ 
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="text-center flex-1">
              <div 
                className="text-lg font-medium"
                style={{ color: config.color }}
              >
                {Math.round(displayReplenishQty)}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                qty to order
              </div>
            </div>
            
            <div className="text-center flex-1">
              <div className="text-lg font-medium text-slate-500">
                {Math.round(inventoryRisk)}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                SKU's ( at Aging Risk )
              </div>
            </div>
            
            <div className="text-center flex-1">
              <div className="text-lg font-medium text-slate-500">
                {demandForecast}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                demand
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes radar-pulse {
          0%, 100% { 
            transform: scale(1); 
            opacity: 0.25; 
          }
          50% { 
            transform: scale(1.05); 
            opacity: 0.15; 
          }
        }
        
        @keyframes blip-ping {
          0% { 
            transform: translate(-50%, -50%) scale(1); 
            opacity: 1; 
          }
          100% { 
            transform: translate(-50%, -50%) scale(2); 
            opacity: 0; 
          }
        }
        
        @keyframes center-pulse {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1); 
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.2); 
          }
        }
      `}</style>
    </div>
  );
};

export default StockRadarCard;
