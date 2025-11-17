import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.scss']
})
export class BlogComponent implements OnInit {
  posts = [
    {
      id: 1,
      title: 'How to Secure Your Email Accounts',
      excerpt: 'Learn the best practices for securing your email accounts and protecting your data.',
      image: '/assets/images/blog/security.jpg',
      date: new Date('2025-01-15'),
      author: 'John Doe',
      category: 'Security'
    },
    {
      id: 2,
      title: 'Choosing the Right Email Provider',
      excerpt: 'A comprehensive guide to selecting the perfect email provider for your needs.',
      image: '/assets/images/blog/providers.jpg',
      date: new Date('2025-01-10'),
      author: 'Jane Smith',
      category: 'Guides'
    },
    {
      id: 3,
      title: 'Email Marketing Best Practices',
      excerpt: 'Maximize your email marketing campaigns with these proven strategies.',
      image: '/assets/images/blog/marketing.jpg',
      date: new Date('2025-01-05'),
      author: 'Mike Johnson',
      category: 'Marketing'
    }
  ];

  constructor(private seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setPageMeta(
      'Blog - MailShop',
      'Read the latest articles about email management, security tips, and industry insights.',
      'blog, email tips, email security, guides'
    );
  }
}
