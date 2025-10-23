import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ROUTES_APP } from '../core/enum/routes.enum';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const localData = localStorage.getItem('angular17token');
  console.log('LOCAL DATA: route', localStorage.getItem('angular17token'), route)
  if (localData) {
    return true;
  } else { 
    console.log("se daña localdata") 
    router.navigateByUrl(ROUTES_APP.LOGIN)
    return false;
  }
};
