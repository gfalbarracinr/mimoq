import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService  } from '../../services/auth/auth.service';
import { ROUTES_APP } from '../../core/enum/routes.enum';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})

export class NavbarComponent implements OnInit {
  isLoggedIn = false;
  constructor(private authService: AuthService, private router: Router) {}
  ngOnInit(): void {
    this.isLoggedIn = localStorage.getItem('angular17token') !== null;
  }

  ngDoCheck(): void {
    this.isLoggedIn = localStorage.getItem('angular17token') !== null;
  }

  redirectToPrincipalAndLogout() {
    this.router.navigateByUrl(ROUTES_APP.HOME);
    this.authService.logout();
  }

  redirectToLogin() {
    this.router.navigateByUrl(ROUTES_APP.LOGIN);
  }

  get ROUTES_APP(){
    return ROUTES_APP;
  }
}
