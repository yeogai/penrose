import im from "immutable";
import * as ad from "./ad.js";
import {
  A,
  AbstractNode,
  C,
  Identifier,
  NodeType,
  SourceLoc,
  SourceRange,
} from "./ast.js";
import { Arg, TypeConstructor, TypeVar } from "./domain.js";
import { CompFunc, ConstrFunc, FuncParam, ObjFunc } from "./functions.js";
import { State } from "./state.js";
import {
  BinOp,
  BindingForm,
  ColorLit,
  Expr,
  GPIDecl,
  LayoutStages,
  Path,
  UOp,
} from "./style.js";
import { ResolvedPath } from "./styleSemantics.js";
import { Deconstructor, SubExpr, TypeConsApp } from "./substance.js";
import { ArgValWithSourceLoc, ShapeVal, Val, Value } from "./value.js";

//#region ErrorTypes

export type PenroseError =
  | (DomainError & { errorType: "DomainError" })
  | (SubstanceError & { errorType: "SubstanceError" })
  | (StyleError & { errorType: "StyleError" })
  | (RuntimeError & { errorType: "RuntimeError" });

export type RuntimeError = RuntimeErrorWithContents | NaNError;

export interface RuntimeErrorWithContents {
  tag: "RuntimeError";
  message: string;
}
export interface NaNError {
  tag: "NaNError";
  message: string;
  lastState: State;
}

export type Warning = StyleWarning;

// TODO: does type var ever appear in Substance? If not, can we encode that at the type level?
export type SubstanceError =
  | ParseError
  | DuplicateName
  | TypeNotFound
  | TypeVarNotFound
  | TypeMismatch
  | ArgLengthMismatch
  | TypeArgLengthMismatch
  | VarNotFound
  | DeconstructNonconstructor
  | UnexpectedExprForNestedPred
  | FatalError; // TODO: resolve all fatal errors in the Substance module

export type DomainError =
  | ParseError
  | TypeDeclared
  | TypeVarNotFound
  | TypeNotFound
  | DuplicateName
  | CyclicSubtypes
  | SymmetricTypeMismatch
  | SymmetricArgLengthMismatch;

export interface SymmetricTypeMismatch {
  tag: "SymmetricTypeMismatch";
  sourceExpr: AbstractNode;
}

export interface SymmetricArgLengthMismatch {
  tag: "SymmetricArgLengthMismatch";
  sourceExpr: AbstractNode;
}

export interface UnexpectedExprForNestedPred {
  tag: "UnexpectedExprForNestedPred";
  sourceType: TypeConstructor<A>;
  sourceExpr: AbstractNode;
  expectedExpr: AbstractNode;
}

export interface CyclicSubtypes {
  tag: "CyclicSubtypes";
  cycles: string[][];
}

export interface TypeDeclared {
  tag: "TypeDeclared";
  typeName: Identifier<A>;
}
export interface DuplicateName {
  tag: "DuplicateName";
  name: Identifier<A>;
  location: AbstractNode;
  firstDefined: AbstractNode;
}
export interface TypeVarNotFound {
  tag: "TypeVarNotFound";
  typeVar: TypeVar<A>;
}
export interface TypeNotFound {
  tag: "TypeNotFound";
  typeName: Identifier<A>;
  possibleTypes?: Identifier<A>[];
}
export interface VarNotFound {
  tag: "VarNotFound";
  variable: Identifier<A>;
  possibleVars?: Identifier<A>[];
}

export interface TypeMismatch {
  tag: "TypeMismatch";
  sourceType: TypeConstructor<A>;
  expectedType: TypeConstructor<A>;
  sourceExpr: AbstractNode;
  expectedExpr: AbstractNode;
}
export interface ArgLengthMismatch {
  tag: "ArgLengthMismatch";
  name: Identifier<A>;
  argsGiven: SubExpr<A>[];
  argsExpected: Arg<A>[];
  sourceExpr: AbstractNode;
  expectedExpr: AbstractNode;
}

export interface TypeArgLengthMismatch {
  tag: "TypeArgLengthMismatch";
  sourceType: TypeConstructor<A>;
  expectedType: TypeConstructor<A>;
  sourceExpr: AbstractNode;
  expectedExpr: AbstractNode;
}

export interface DeconstructNonconstructor {
  tag: "DeconstructNonconstructor";
  deconstructor: Deconstructor<A>;
}

export interface MultipleLayoutError {
  tag: "MultipleLayoutError";
  decls: LayoutStages<C>[];
}

// NOTE: for debugging purposes
export interface FatalError {
  tag: "Fatal";
  message: string;
}

// NOTE: aliased to AbstractNode for now, can include more types for different errors
export type ErrorSource = AbstractNode;

//#endregion

//#region Style errors

export type StyleError =
  // Misc errors
  | ParseError
  | GenericStyleError
  | StyleErrorList
  | InvalidColorLiteral
  // Selector errors (from Substance)
  | SelectorVarMultipleDecl
  | SelectorDeclTypeMismatch
  | SelectorRelTypeMismatch
  | SelectorFieldNotSupported
  | TaggedSubstanceError
  | SelectorAliasNamingError
  // Block static errors
  | InvalidGPITypeError
  | InvalidGPIPropertyError
  | InvalidFunctionNameError
  | InvalidObjectiveNameError
  | InvalidConstraintNameError
  // Compilation errors
  | AssignAccessError
  | AssignGlobalError
  | AssignSubstanceError
  | BadElementError
  | BadIndexError
  | BinOpTypeError
  | CanvasNonexistentDimsError
  | CyclicAssignmentError
  | DeleteGlobalError
  | DeleteSubstanceError
  | MultipleLayoutError
  | MissingPathError
  | MissingShapeError
  | NestedShapeError
  | NotCollError
  | IndexIntoShapeListError
  | NotShapeError
  | NotValueError
  | OutOfBoundsError
  | PropertyMemberError
  | UOpTypeError
  | BadShapeParamTypeError
  | BadArgumentTypeError
  | MissingArgumentError
  | TooManyArgumentsError
  | FunctionInternalError
  | RedeclareNamespaceError
  | UnexpectedCollectionAccessError
  | LayerOnNonShapesError
  // Runtime errors
  | RuntimeValueTypeError;

// Compilation warnings
export type StyleWarning =
  | ImplicitOverrideWarning
  | NoopDeleteWarning
  | LayerCycleWarning
  | ShapeBelongsToMultipleGroupsWarning
  | GroupCycleWarning
  | FunctionInternalWarning;

export type FunctionInternalWarning = BBoxApproximationWarning;

export interface StyleDiagnostics {
  errors: im.List<StyleError>;
  warnings: im.List<StyleWarning>;
}

//#region compilation warnings

export interface ImplicitOverrideWarning {
  tag: "ImplicitOverrideWarning";
  path: ResolvedPath<C>;
}

export interface NoopDeleteWarning {
  tag: "NoopDeleteWarning";
  path: ResolvedPath<C>;
}
export interface LayerCycleWarning {
  tag: "LayerCycleWarning";
  cycles: string[][];
  approxOrdering: string[];
}
export interface ShapeBelongsToMultipleGroupsWarning {
  tag: "ShapeBelongsToMultipleGroups";
  shape: string;
  groups: string[];
}
export interface GroupCycleWarning {
  tag: "GroupCycleWarning";
  cycles: string[][];
}

export interface BBoxApproximationWarning {
  tag: "BBoxApproximationWarning";
  // tail is the top of stack
  stack: [BBoxApproximationWarningItem, ...BBoxApproximationWarningItem[]];
}

export interface BBoxApproximationWarningItem {
  signature: string;
  location?: SourceRange;
}

//#endregion

export interface GenericStyleError {
  tag: "GenericStyleError";
  messages: string[];
}

export interface StyleErrorList {
  tag: "StyleErrorList";
  errors: StyleError[];
}

export interface ParseError {
  tag: "ParseError";
  message: string;
  location?: SourceLoc;
  fileType?: NodeType;
}

export interface InvalidColorLiteral {
  tag: "InvalidColorLiteral";
  color: ColorLit<C>;
}

export interface SelectorVarMultipleDecl {
  tag: "SelectorVarMultipleDecl";
  varName: BindingForm<A>;
}

export interface SelectorDeclTypeMismatch {
  tag: "SelectorDeclTypeMismatch";
  subType: TypeConsApp<A>;
  styType: TypeConsApp<A>;
}

export interface SelectorRelTypeMismatch {
  tag: "SelectorRelTypeMismatch";
  varType: TypeConsApp<A>;
  exprType: TypeConsApp<A>;
}

export interface SelectorFieldNotSupported {
  tag: "SelectorFieldNotSupported";
  name: BindingForm<A>;
  field: Identifier<A>;
}

export interface TaggedSubstanceError {
  tag: "TaggedSubstanceError";
  error: SubstanceError;
}

export interface SelectorAliasNamingError {
  tag: "SelectorAliasNamingError";
  alias: Identifier<A>;
}

//#region Block statics

export interface InvalidGPITypeError {
  tag: "InvalidGPITypeError";
  givenType: Identifier<A>;
  // expectedType: string;
}

export interface InvalidGPIPropertyError {
  tag: "InvalidGPIPropertyError";
  givenProperty: Identifier<A>;
  expectedProperties: string[];
}

export interface InvalidFunctionNameError {
  tag: "InvalidFunctionNameError";
  givenName: Identifier<A>;
  // expectedName: string;
}

export interface InvalidObjectiveNameError {
  tag: "InvalidObjectiveNameError";
  givenName: Identifier<A>;
  // expectedName: string;
}

export interface InvalidConstraintNameError {
  tag: "InvalidConstraintNameError";
  givenName: Identifier<A>;
  // expectedName: string;
}

//#endregion Block statics

//#region compilation errors

export interface AssignAccessError {
  tag: "AssignAccessError";
  path: Path<C>;
}

export interface AssignGlobalError {
  tag: "AssignGlobalError";
  path: ResolvedPath<C>;
}

export interface AssignSubstanceError {
  tag: "AssignSubstanceError";
  path: ResolvedPath<C>;
}

export interface BadElementError {
  tag: "BadElementError";
  coll: Expr<C>;
  index: number;
}

export interface BadIndexError {
  tag: "BadIndexError";
  expr: Expr<C>;
}

export interface BinOpTypeError {
  tag: "BinOpTypeError";
  expr: BinOp<C>;
  left: Value<ad.Num>["tag"];
  right: Value<ad.Num>["tag"];
}

export interface CanvasNonexistentDimsError {
  tag: "CanvasNonexistentDimsError";
  attr: "width" | "height";
  kind: "missing" | "GPI" | "wrong type";
  type?: Expr<A>["tag"];
}

export interface CyclicAssignmentError {
  tag: "CyclicAssignmentError";
  // TODO: improve types, currently the generated id and source location
  cycles: { id: string; src: SourceRange | undefined }[][];
}

export interface DeleteGlobalError {
  tag: "DeleteGlobalError";
  path: ResolvedPath<C>;
}

export interface DeleteSubstanceError {
  tag: "DeleteSubstanceError";
  path: ResolvedPath<C>;
}

export interface MissingPathError {
  tag: "MissingPathError";
  path: ResolvedPath<C>;
}

export interface MissingShapeError {
  tag: "MissingShapeError";
  path: ResolvedPath<C>;
}

export interface NestedShapeError {
  tag: "NestedShapeError";
  expr: GPIDecl<C>;
}

export interface NotCollError {
  tag: "NotCollError";
  expr: Expr<C>;
}

export interface IndexIntoShapeListError {
  tag: "IndexIntoShapeListError";
  expr: Expr<C>;
}

export interface NotShapeError {
  tag: "NotShapeError";
  path: ResolvedPath<C>;
  what: string;
}

export interface NotValueError {
  tag: "NotValueError";
  expr: Expr<C>;
  what?: string;
}

export interface OutOfBoundsError {
  tag: "OutOfBoundsError";
  expr: Path<C>;
  indices: number[];
}

export interface PropertyMemberError {
  tag: "PropertyMemberError";
  path: ResolvedPath<C>;
}

export interface UOpTypeError {
  tag: "UOpTypeError";
  expr: UOp<C>;
  arg: Value<ad.Num>["tag"];
}

export interface BadShapeParamTypeError {
  tag: "BadShapeParamTypeError";
  path: string;
  value: Val<ad.Num> | ShapeVal<ad.Num>;
  expectedType: string;
  passthrough: boolean;
}

export interface BadArgumentTypeError {
  tag: "BadArgumentTypeError";
  funcName: string;
  funcArg: FuncParam;
  provided: ArgValWithSourceLoc<ad.Num>;
}

export interface MissingArgumentError {
  tag: "MissingArgumentError";
  funcName: string;
  funcArg: FuncParam;
  funcLocation: SourceRange;
}

export interface TooManyArgumentsError {
  tag: "TooManyArgumentsError";
  func: CompFunc | ObjFunc | ConstrFunc;
  funcLocation: SourceRange;
  numProvided: number;
}

export interface FunctionInternalError {
  tag: "FunctionInternalError";
  func: CompFunc | ObjFunc | ConstrFunc;
  location: SourceRange;
  message: string;
}

export interface RedeclareNamespaceError {
  tag: "RedeclareNamespaceError";
  existingNamespace: string;
  location: SourceRange; // location of the duplicated declaration
}

export interface UnexpectedCollectionAccessError {
  tag: "UnexpectedCollectionAccessError";
  name: string;
  location: SourceRange;
}

export interface LayerOnNonShapesError {
  tag: "LayerOnNonShapesError";
  location: SourceRange;
  expr: string;
}

//#endregion

// TODO(errors): use identifiers here
export interface RuntimeValueTypeError {
  tag: "RuntimeValueTypeError";
  path: Path<A>;
  expectedType: string;
  actualType: string;
}

//#endregion Style errors
