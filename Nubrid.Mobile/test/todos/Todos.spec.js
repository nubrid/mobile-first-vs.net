
define(["apps/AppManager", "apps/todos/App", "apps/todos/list/Controller", "apps/common/View", "apps/todos/list/View"], function(AppManager, App, Controller, CommonView, View) {
  return describe("Todos", function() {
    before(function() {
      this.options = {
        id: "todos",
        title: "Todos List"
      };
      return $("<div id='fixture' style='display:none'>").appendTo("body");
    });
    after(function() {
      return $("#fixture").remove();
    });
    describe("App", function() {
      return it("creates an app", function() {
        AppManager.should.exist;
        return App.should.exist;
      });
    });
    describe("Controller", function() {
      before(function() {
        return this.changePage = sinon.stub(AppManager, "changePage", function() {
          return Backbone.Events;
        });
      });
      after(function() {
        return this.changePage.restore();
      });
      it("creates a controller", function() {
        return Controller.should.exist;
      });
      return it("list todos when started", function() {
        Controller.start();
        AppManager.trigger("todos:list");
        this.changePage.should.have.been.calledOnce;
        return this.changePage.should.have.been.calledWithMatch(this.options);
      });
    });
    describe("Common View", function() {
      before(function() {
        var _options;
        $("#fixture").append("<div id='PanelRegion' /><div id='HeaderRegion' /><div id='MainRegion' /><div id='FooterRegion' />").appendTo("body");
        _options = _.extend(this.options, {
          main: Marionette.ItemView.extend({
            render: function() {}
          })
        });
        return new CommonView.Layout(_options);
      });
      after(function() {
        return $("#fixture").empty();
      });
      it("displays the header", function() {
        return $("#fixture #HeaderRegion h1.ui-title").should.have.text(this.options.title);
      });
      return it("displays the content", function() {
        return $("#fixture #MainRegion #todos").should.exist;
      });
    });
    return describe("View", function() {
      before(function() {
        var mainRegion;
        this.actionType = AppManager.TodosApp.Constants.ActionType;
        $("#fixture").append("<div id='PanelRegion' /><div id='HeaderRegion' /><div id='MainRegion' /><div id='FooterRegion' />").appendTo("body");
        mainRegion = Marionette.Region.extend({
          el: "#MainRegion"
        });
        this.view = new View.Todos(_.extend(this.options, {
          region: new mainRegion()
        }));
        this.react = React.addons.TestUtils;
        this.request = sinon.stub(AppManager, "request", function() {
          var defer;
          defer = $.Deferred();
          setTimeout(function() {
            return defer.resolve(new Backbone.Collection([
              {
                id: "1",
                title: "Todo 1",
                completed: false
              }, {
                id: "2",
                title: "Todo 2",
                completed: true
              }
            ]));
          });
          return defer.promise();
        });
        return this.submitForm = $.proxy(function(inputValue, actionType) {
          var form, input, submit;
          form = React.findDOMNode(this.form);
          input = $(form).find("input[type='text']");
          this.react.Simulate.change(input[0], {
            target: {
              value: inputValue
            }
          });
          submit = React.findDOMNode(this.form.refs.btnSubmit);
          $(submit).click();
          this.trigger.should.have.been.calledOnce;
          return this.trigger.should.have.been.calledWithMatch(actionType, {
            title: inputValue
          });
        }, this);
      });
      beforeEach(function() {
        return this.trigger = sinon.stub(this.view, "trigger");
      });
      after(function() {
        this.request.restore();
        return $("#fixture").empty();
      });
      afterEach(function() {
        return this.trigger.restore();
      });
      it("renders a page", function() {
        this.view.render();
        $.mobile.initializePage();
        this.view.page.should.exist;
        this.view.el.should.exist;
        return this.react.findRenderedComponentWithType(this.view.page, View.React.Todos).should.exist;
      });
      describe("Form", function() {
        it("renders a form", function() {
          this.form = this.react.findRenderedComponentWithType(this.view.page, View.React.TodosForm);
          return this.form.should.exist;
        });
        return it("creates a todo when submitted", function() {
          return this.submitForm("Todo 1", this.actionType.CREATE);
        });
      });
      return describe("List", function() {
        it("renders a list", function() {
          this.list = this.react.findRenderedComponentWithType(this.view.page, View.React.TodosList);
          return this.list.should.exist;
        });
        it("fetches todos collection", function(done) {
          var $el;
          this.request.should.have.been.calledOnce;
          this.request.should.have.been.calledWithMatch("todo:entities");
          $el = this.list.$el;
          return setTimeout(function() {
            $el.should.exist;
            $el.children().should.have.length(2);
            return done();
          }, 1);
        });
        it("can edit a todo", function(done) {
          return setTimeout($.proxy(function() {
            var form, input, todo;
            todo = this.list.$el.children().first();
            todo.find("#btnEditTodo").click();
            form = React.findDOMNode(this.form);
            input = $(form).find("input[type='text']");
            input.should.have.value("Todo 1");
            this.submitForm("Todo 3", this.actionType.UPDATE);
            return done();
          }, this), 1);
        });
        return it("can delete a todo", function(done) {
          return setTimeout($.proxy(function() {
            var todo;
            todo = this.list.$el.children().first();
            todo.find("#btnDeleteTodo").click();
            this.trigger.should.have.been.calledOnce;
            this.trigger.should.have.been.calledWithMatch(this.actionType.DELETE);
            return done();
          }, this), 1);
        });
      });
    });
  });
});
