﻿/*
Home Show Controller
*/
define(
["apps/AppManager"
, "apps/common/View"
, "apps/home/show/View"]
, function (AppManager, CommonView, ShowView) {
	var Controller = AppManager.module("HomeApp.Show.Controller", AppManager.CommonModule.extend({
		showHome: function () {
			var show = AppManager.changePage({ url: "home", layout: CommonView.Layout, main: ShowView.Panel, reverse: true });

			show.on("home:openBrowser", function () {
				AppManager.net(function () {
					var ref = window.open(show.ui.txtInput.val(), "_blank", "location=no");

					setTimeout(function () {
						ref.close();
					}, 5000);
				});
			});

			show.on("home:login", function (event) {
				var provider = $(event.target).attr("href").substring(1);

				AppManager.net(function () {
					var loginWindow = window.open(AppManager.Url.Web + "/auth/" + provider, "_blank", "location=no");

					loginWindow.addEventListener("loadstop", function (event) {
						if (event.url.indexOf(AppManager.Url.Web) == 0) {
							if (event.url.indexOf(AppManager.Url.Web + "/#failed") == 0) {
								alert("Login failed!");
							}
							else if (event.url.indexOf(AppManager.Url.Web + "/") == 0) {
								alert("Login succeeded! See console for profile.");
							}

							loginWindow.close();
						}
					});
				});

				event.preventDefault();
				return false;
			});
		}
		, onStart: function () {
		    AppManager.on("home:show", this.showHome);
		}
	}));

	return Controller;
});