package Backend.repository;

import Backend.model.todoModel;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TodoRepository extends JpaRepository<todoModel, Long> {
}