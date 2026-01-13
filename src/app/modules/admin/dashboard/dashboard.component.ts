import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';
import { StatisticsService } from '../../../core/services/statistics.service';
import { DashboardOverview, RevenueChartData, StatisticsFilter } from '../../../core/models/statistics.model';
import { Chart, registerables } from 'chart.js';

// Register all Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;

  private readonly seoService = inject(SeoService);
  private readonly statisticsService = inject(StatisticsService);

  private chart: Chart | null = null;

  stats: DashboardOverview = {
    ordersToday: 0,
    ordersYesterday: 0,
    ordersGrowthPercent: 0,
    revenueToday: 0,
    revenueYesterday: 0,
    revenueGrowthPercent: 0,
    ordersThisMonth: 0,
    revenueThisMonth: 0,
    totalOrders: 0,
    totalRevenue: 0
  };

  chartData: RevenueChartData | null = null;
  loading = true;
  chartLoading = false;

  // Filter options
  selectedPeriod: 'WEEK' | 'MONTH' | 'YEAR' = 'WEEK';

  ngOnInit(): void {
    this.seoService.setTitle('Admin Dashboard - EmailSieuRe');
    this.loadOverviewStats();
  }

  ngAfterViewInit(): void {
    // Chart will be loaded after overview stats complete
    // to ensure canvas element is in DOM (not hidden by @if loading)
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  loadOverviewStats(): void {
    this.loading = true;
    this.statisticsService.getOverview().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.stats = response.data;
        }
        this.loading = false;
        // Load chart after overview completes - canvas is now in DOM
        setTimeout(() => this.loadChartData(), 100);
      },
      error: (error) => {
        console.error('Error loading overview stats:', error);
        this.loading = false;
        // Still try to load chart
        setTimeout(() => this.loadChartData(), 100);
      }
    });
  }

  loadChartData(): void {
    this.chartLoading = true;
    const filter: StatisticsFilter = { period: this.selectedPeriod };

    this.statisticsService.getRevenueChart(filter).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.chartData = response.data;
          // Use setTimeout to ensure DOM is updated after chartLoading changes
          setTimeout(() => this.renderChart(), 50);
        }
        this.chartLoading = false;
      },
      error: (error) => {
        console.error('Error loading chart data:', error);
        this.chartLoading = false;
      }
    });
  }

  onPeriodChange(): void {
    this.loadChartData();
  }

  private renderChart(): void {
    if (!this.chartData || !this.revenueChartRef) return;

    // Destroy previous chart if exists
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.revenueChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.chartData.labels,
        datasets: [
          {
            label: 'Doanh thu (VND)',
            data: this.chartData.revenues,
            backgroundColor: 'rgba(102, 126, 234, 0.8)',
            borderColor: 'rgba(102, 126, 234, 1)',
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: 'y'
          },
          {
            label: 'Số đơn hàng',
            data: this.chartData.orderCounts,
            type: 'line',
            borderColor: 'rgba(245, 87, 108, 1)',
            backgroundColor: 'rgba(245, 87, 108, 0.1)',
            borderWidth: 3,
            pointRadius: 5,
            pointBackgroundColor: 'rgba(245, 87, 108, 1)',
            fill: true,
            yAxisID: 'y1',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14 },
            bodyFont: { size: 13 },
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                if (value === null || value === undefined) return '';
                if (label.includes('Doanh thu')) {
                  return `${label}: ${value.toLocaleString('vi-VN')} VND`;
                }
                return `${label}: ${value}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Doanh thu (VND)'
            },
            ticks: {
              callback: (value) => {
                if (typeof value === 'number') {
                  if (value >= 1000000) {
                    return (value / 1000000).toFixed(1) + 'M';
                  } else if (value >= 1000) {
                    return (value / 1000).toFixed(0) + 'K';
                  }
                }
                return value;
              }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Số đơn hàng'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });
  }

  // Format helpers
  formatCurrency(value: number): string {
    return value.toLocaleString('vi-VN');
  }

  getGrowthClass(percent: number): string {
    if (percent > 0) return 'text-success';
    if (percent < 0) return 'text-danger';
    return 'text-muted';
  }

  getGrowthIcon(percent: number): string {
    if (percent > 0) return 'bi-arrow-up';
    if (percent < 0) return 'bi-arrow-down';
    return 'bi-dash';
  }

  getPeriodLabel(): string {
    switch (this.selectedPeriod) {
      case 'WEEK': return '7 ngày qua';
      case 'MONTH': return '30 ngày qua';
      case 'YEAR': return '12 tháng qua';
      default: return '';
    }
  }
}
