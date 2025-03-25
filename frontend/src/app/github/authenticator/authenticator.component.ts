import { HttpClient, HttpHeaders } from '@angular/common/http';
import { afterNextRender, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-authenticator',
  imports: [],
  templateUrl: './authenticator.component.html',
  styleUrl: './authenticator.component.less'
})
export class AuthenticatorComponent {
  constructor(private route: ActivatedRoute, httpClient: HttpClient) {
    route.queryParamMap.subscribe(p => {
      const clientId = "Ov23li7Jdaf4LB3HW9uz"; // Dev
      //const clientId = "Ov23liXhxRSjKSYjdyxu"; // Prod

      const clientSecret = "fa0e58f95bb1fcf0012363c0e80ae864cc45c7ca"; // Dev

      if (p.has("code")) {
        const body = new URLSearchParams();
        body.set("code", p.get("code")!);
        body.set("client_id", clientId);
        body.set("client_secret", clientSecret);

        httpClient.post(
          "https://github.com/login/oauth/access_token",
          body.toString(),
          {
            headers: new HttpHeaders().set(
              "Content-Type",
              "application/x-www-form-urlencoded"
            )
          }
        ).subscribe(res => console.log("result: ", res));
        console.log("code: ", p.get("code"));
      } else {
        location.assign(`https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo`)
      }
    })
  }
}
