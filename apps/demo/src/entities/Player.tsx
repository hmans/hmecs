import { ECS, physics } from "../state"

export const Player = () => {
  return (
    <ECS.Entity>
      <ECS.Property name="isPlayer" value={true} />
      <ECS.Property name="physics" value={physics({ radius: 0.3, mass: 10 })} />
      <ECS.Property name="spatialHashing" value={{}} />
      <ECS.Property name="neighbors" value={[]} />
      <ECS.Property name="transform">
        <mesh>
          <coneGeometry args={[0.5, 1]} />
          <meshStandardMaterial color="hotpink" />
        </mesh>
      </ECS.Property>
    </ECS.Entity>
  )
}