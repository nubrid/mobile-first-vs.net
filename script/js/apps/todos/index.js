﻿import CommonApp from "common/App"
import View from "./View"

const TodosApp = () => {
  const children = (/*CommonApp this.state*/) => <View />
  return <CommonApp name="todos">{children}</CommonApp>
}

export default TodosApp
