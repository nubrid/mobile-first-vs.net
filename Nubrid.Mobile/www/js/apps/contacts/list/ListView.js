define(
["apps/ContactManager"
, "text!apps/contacts/list/ListLayout.html"
, "text!apps/contacts/list/ListPanel.html"
, "text!apps/contacts/list/ListItem.html"
, "text!apps/contacts/list/ListNone.html"
, "text!apps/contacts/list/List.html"]
, function (ContactManager, ListLayoutTemplate, ListPanelTemplate, ListItemTemplate, ListNoneTemplate, ListTemplate) {
	var List = ContactManager.module("ContactsApp.List");
	List.Layout = Marionette.LayoutView.extend({
		template: _.template(ListLayoutTemplate),

		regions: {
			panelRegion: "#panel-region",
			contactsRegion: "#contacts-region"
		}
	});

	List.Panel = Marionette.ItemView.extend({
		template: _.template(ListPanelTemplate),

		triggers: {
			"click button.js-new": "contact:new"
		},

		events: {
			"submit #filter-form": "filterContacts"
		},

		ui: {
			criterion: "input.js-filter-criterion"
		},

		filterContacts: function (e) {
			e.preventDefault();
			var criterion = this.$(".js-filter-criterion").val();
			this.trigger("contacts:filter", criterion);
		},

		onSetFilterCriterion: function (criterion) {
			this.ui.criterion.val(criterion);
		}
	});

	List.Contact = Marionette.ItemView.extend({
		tagName: "tr",
		template: _.template(ListItemTemplate),

		triggers: {
			"click td a.js-show": "contact:show",
			"click td a.js-edit": "contact:edit",
			"click button.js-delete": "contact:delete"
		},

		events: {
			"click": "highlightName"
		},

		flash: function (cssClass) {
			var $view = this.$el;
			$view.hide().toggleClass(cssClass).fadeIn(800, function () {
				setTimeout(function () {
					$view.toggleClass(cssClass)
				}, 500);
			});
		},

		highlightName: function (e) {
			this.$el.toggleClass("warning");
		},

		remove: function () {
			var self = this;
			this.$el.fadeOut(function () {
				Marionette.ItemView.prototype.remove.call(self);
			});
		}
	});

	var NoContactsView = Marionette.ItemView.extend({
		template: _.template(ListNoneTemplate),
		tagName: "tr",
		className: "alert"
	});

	List.Contacts = Marionette.CompositeView.extend({
		tagName: "table",
		className: "table table-hover",
		template: _.template(ListTemplate),
		emptyView: NoContactsView,
		childView: List.Contact,
		childViewContainer: "tbody",

		initialize: function () {
			this.listenTo(this.collection, "reset", function () {
				this.attachHtml = function (collectionView, childView, index) {
					collectionView.$el.append(childView.el);
				}
			});
		},

		onRenderCollection: function () {
			this.attachHtml = function (collectionView, childView, index) {
				collectionView.$el.prepend(childView.el);
			}
		}
	});
});