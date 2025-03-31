"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import React, { useState } from "react";

interface BylawSearchFiltersProps {
  onApplyFilters: (filters: {
    category?: string;
    bylawNumber?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }) => void;
}

const CATEGORIES = [
  { value: "zoning", label: "Zoning & Land Use" },
  { value: "trees", label: "Tree Protection" },
  { value: "animals", label: "Animal Control" },
  { value: "noise", label: "Noise Control" },
  { value: "building", label: "Building & Construction" },
  { value: "traffic", label: "Traffic & Parking" },
  { value: "general", label: "General Regulations" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "repealed", label: "Repealed" },
  { value: "superseded", label: "Superseded" },
  { value: "draft", label: "Draft" },
];

export function BylawSearchFilters({
  onApplyFilters,
}: BylawSearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [category, setCategory] = useState("");
  const [bylawNumber, setBylawNumber] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("active");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const handleApplyFilters = () => {
    // Collect active filters for badge display
    const newActiveFilters: string[] = [];
    if (category)
      newActiveFilters.push(
        `Category: ${CATEGORIES.find((c) => c.value === category)?.label || category}`,
      );
    if (bylawNumber) newActiveFilters.push(`Bylaw: ${bylawNumber}`);
    if (dateFrom) newActiveFilters.push(`From: ${dateFrom}`);
    if (dateTo) newActiveFilters.push(`To: ${dateTo}`);
    if (status)
      newActiveFilters.push(
        `Status: ${STATUS_OPTIONS.find((s) => s.value === status)?.label || status}`,
      );

    setActiveFilters(newActiveFilters);

    // Apply filters
    onApplyFilters({
      category: category || undefined,
      bylawNumber: bylawNumber || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: status || undefined,
    });

    // Collapse the filter panel after applying
    setIsExpanded(false);
  };

  const handleReset = () => {
    setCategory("");
    setBylawNumber("");
    setDateFrom("");
    setDateTo("");
    setStatus("active");
    setActiveFilters([]);
    onApplyFilters({});
  };

  return (
    <div className="mb-4">
      <div className="mb-2 flex flex-wrap items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mb-2"
        >
          <Filter size={16} className="mr-2" />
          {isExpanded ? "Hide Filters" : "Show Filters"}
          {activeFilters.length > 0 && !isExpanded && (
            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {activeFilters.length}
            </span>
          )}
        </Button>

        {activeFilters.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <span
                key={`filter-${filter}`}
                className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-200"
              >
                {filter}
              </span>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleReset}
            >
              <X size={12} className="mr-1" />
              Clear All
            </Button>
          </div>
        )}
      </div>

      {isExpanded && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bylawCategory">Bylaw Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="bylawCategory">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bylawNumber">Bylaw Number</Label>
                <Input
                  id="bylawNumber"
                  placeholder="e.g. 4620"
                  value={bylawNumber}
                  onChange={(e) => setBylawNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bylawStatus">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="bylawStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any Status</SelectItem>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                Reset Filters
              </Button>
              <Button onClick={handleApplyFilters}>Apply Filters</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
