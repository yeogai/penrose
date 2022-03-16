type Vertex
type Edge
type Triangle

type Angle

constructor MakeEdge( Vertex i, Vertex j ) -> Edge
constructor MakeTriangle( Vertex i, Vertex j, Vertex k ) -> Triangle

constructor EuclideanCorner( Vertex i, Vertex j1, Vertex j2 ) -> Angle
constructor CATCorner( Vertex i, Vertex j1, Vertex j2 ) -> Angle
constructor BendAngle( Vertex i, Vertex j ) -> Angle
constructor ExteriorAngle( Vertex i, Vertex j, Vertex k ) -> Angle

