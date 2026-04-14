"use client"

// @ts-nocheck
import * as React from "react"
import { useMemo } from "react"
import * as RechartsPrimitive from "recharts"
import { cn } from "@/lib/utils"

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
}: any) {
  const config = {}

  const tooltipLabel = useMemo(() => {
    if (!active || hideLabel || !payload?.length) return null

    const item = payload[0]
    const value = label ?? item?.name ?? item?.dataKey

    if (!value) return null

    return (
      <div className={cn("font-medium", labelClassName)}>
        {labelFormatter ? labelFormatter(value, payload) : value}
      </div>
    )
  }, [active, payload, hideLabel, label, labelFormatter, labelClassName])

  if (!active || !payload?.length) return null

  return (
    <div
      className={cn(
        "border bg-background rounded-lg p-2 text-xs shadow-md",
        className
      )}
    >
      {!hideLabel && tooltipLabel}

      <div className="flex flex-col gap-1 mt-1">
        {payload.map((item: any, index: number) => {
          const indicatorColor = color || item?.color

          return (
            <div key={index} className="flex items-center justify-between gap-2">
              {!hideIndicator && (
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: indicatorColor }}
                />
              )}

              <span className="text-muted-foreground">
                {item.name}
              </span>

              <span className="font-mono">
                {item.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend

export {
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
}