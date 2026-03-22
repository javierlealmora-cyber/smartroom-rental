# Page snapshot

```yaml
- generic [ref=e3]:
  - img "SmartRoom Manager" [ref=e5]
  - generic [ref=e7]:
    - heading "Inicio de Sesion" [level=1] [ref=e8]
    - paragraph [ref=e9]: Accede a tu cuenta de SmartRoom Rental Platform
    - generic [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]: Email
        - textbox "tu@email.com" [ref=e13]
      - generic [ref=e14]:
        - generic [ref=e15]: Contrasena
        - generic [ref=e16]:
          - textbox "Tu contrasena" [ref=e17]
          - button "Mostrar" [ref=e18] [cursor=pointer]:
            - img [ref=e19]
      - button "Iniciar sesion" [disabled] [ref=e22] [cursor=pointer]
    - button "Olvidaste tu contrasena?" [ref=e23] [cursor=pointer]
    - paragraph [ref=e24]:
      - text: No tienes cuenta?
      - link "Registrate" [ref=e25] [cursor=pointer]:
        - /url: /v2/registro
    - generic [ref=e26]:
      - link "Acceso Comercial" [ref=e27] [cursor=pointer]:
        - /url: /v2/auth/login
      - generic [ref=e28]: "|"
      - link "Acceso Inquilinos" [ref=e29] [cursor=pointer]:
        - /url: /v2/lodger/auth/login
```