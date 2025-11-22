import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private readonly seoService = inject(SeoService);
  private readonly authService = inject(AuthService);

  isAuthenticated = false;

  services = [
    {
      id: 1,
      name: 'Check Mail',
      icon: 'check-circle',
      color: 'blue',
      rating: '4.8/5'
    },
    {
      id: 2,
      name: 'Biết Code',
      icon: 'code',
      color: 'yellow',
      rating: '4.9/5'
    },
    {
      id: 3,
      name: 'Đơc khoá thư',
      icon: 'unlock',
      color: 'purple',
      rating: '4.7/5'
    },
    {
      id: 4,
      name: 'Dùng Lý phần',
      icon: 'mobile-alt',
      color: 'teal',
      rating: '4.8/5'
    },
    {
      id: 5,
      name: 'Giải 24h',
      icon: 'clock',
      color: 'green',
      rating: '4.9/5'
    },
    {
      id: 6,
      name: 'Dùng Lý Homiball',
      icon: 'star',
      color: 'purple',
      rating: '4.8/5'
    },
    {
      id: 7,
      name: 'Unlock Homiball',
      icon: 'lock-open',
      color: 'orange',
      rating: '4.9/5'
    },
    {
      id: 8,
      name: 'Dùng Lý yellow',
      icon: 'star',
      color: 'green',
      rating: '4.8/5'
    }
  ];

  productGroup1 = [
    {
      id: 1,
      name: 'Hotmail Nạp',
      description: 'Tài khoản Hotmail với độ tuổi tối thiểu 3-5 giây',
      duration: '3-5 giây',
      price: '40 VNĐ',
      quantity: '0'
    },
    {
      id: 2,
      name: 'Outlook Nạp',
      description: 'Tài khoản Outlook với độ tuổi tối thiểu 3-5 giây',
      duration: '3-5 giây',
      price: '1222',
      quantity: '0'
    },
    {
      id: 3,
      name: 'Hotmail Trusted',
      description: 'Tài khoản Hotmail Trusted với độ tuổi tối thiểu 6-12 Tháng',
      duration: '6-12 Tháng',
      price: '250 VNĐ',
      quantity: '0'
    },
    {
      id: 4,
      name: 'Outlook Trusted',
      description: 'Tài khoản Outlook Trusted với độ tuổi tối thiểu 6-12 Tháng',
      duration: '6-12 Tháng',
      price: '250 VNĐ',
      quantity: '0'
    }
  ];

  productGroup2 = [
    {
      id: 5,
      name: 'Outlook PVA - chưa thêm khóa phụ',
      description: 'Tài khoản cá nhân, ChuSẵn Outlook PVA chưa thêm khóa phụ',
      duration: '12-36 Tháng',
      price: '100 VNĐ',
      quantity: '0'
    }
  ];

  constructor() {}

  ngOnInit(): void {
    this.authService.isAuthenticated$.subscribe((isAuth) => {
      this.isAuthenticated = isAuth;
    });

    this.seoService.setTitle('MailShop - Chuyên cung cấp tài nguyên marketing');
    this.seoService.setMetaDescription('Cung cấp tài khoản email uy tín, chất lượng cao cho marketing, quảng cáo.');
    this.seoService.setOpenGraph({
      title: 'MailShop - Cung cấp tài nguyên',
      description: 'Marketplace tài khoản email marketing',
      image: '/assets/images/og-home.jpg',
      url: 'https://mailshop.com'
    });
  }
}
