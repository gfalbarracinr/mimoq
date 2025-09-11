import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { ROUTES_APP } from '../../core/enum/routes.enum';
import { Usuario } from '../../core/model/usuario/usuario';

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  usuarioLogin: Usuario = {} as Usuario;
  constructor(private router: Router) { }

  login(usuario: Usuario) {
    this.usuarioLogin = new Usuario(
      usuario.documento,
      usuario.nombre,
      usuario.correo,
      usuario.contrasena,
      usuario.id_usuario || 0,
    );
    localStorage.setItem('user', this.usuarioLogin.toString())
  }
  getUsuario(): Usuario {
    return JSON.parse(localStorage.getItem('user') || '{}')
  }

  verificarSesion(): boolean {
    const token = localStorage.getItem('angular17token');
    const user = this.getUsuario();
    if (Object.keys(user).length == 0) {
      this.logout();
      return false;
    } else if (token) {
      return true;
    } else {
      return false;
    }
  }

  logout() {
    localStorage.removeItem('angular17token');
    localStorage.removeItem('user')
    this.usuarioLogin = {} as Usuario;
    this.router.navigateByUrl(ROUTES_APP.HOME);
  }
}
