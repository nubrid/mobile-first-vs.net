﻿import _ from "lodash/fp";
import Controller from "apps/common/Controller";
import { IFrame } from "apps/common/View";
import Main from "./View";

export default (id, callback) => {
  callback(
    new Controller({
      id,
      title: "Home",
      Main,
      IFrame,

      show() {
        const page = AppManager.changePage(
          _.pick(this, ["id", "title", "Main", "Layout"]),
        );

        page.on("home:openBrowser", value =>
          AppManager.net(() =>
            AppManager.popup({
              Popup: this.IFrame,
              src: value,
              width: 400,
              height: 300,
            }),
          ),
        );

        page.on("home:login", event => {
          let provider = event.target.getAttribute("href").substring(1);

          AppManager.net(() => {
            const loginWindow = window.open(
              `${AppManager.url}/auth/${provider}`,
              "_blank",
              "location=no",
            );

            loginWindow.addEventListener("loadstop", event => {
              if (_.startsWith(event.url, AppManager.url)) {
                if (_.startsWith(event.url, `${AppManager.url}/#failed`)) {
                  alert("Login failed!");
                } else if (_.startsWith(event.url, `${AppManager.url}/`)) {
                  alert("Login succeeded! See console for profile.");
                }

                loginWindow.close();
              }
            });
          });

          event.preventDefault();
          return false;
        });

        AppManager.navigate("home", { replace: true });
      },
    }),
  );
};
