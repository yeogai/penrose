type Vertex
type Edge
type Triangle
type Corner

constructor MakeEdge( Vertex i, Vertex j ) -> Edge
constructor MakeTriangle( Vertex i, Vertex j, Vertex k ) -> Triangle
constructor MakeCorner( Vertex i, Vertex j1, Vertex j2 ) -> Corner

